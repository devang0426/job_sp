# Data Model

The full Prisma schema. Postgres on Neon: pooled `-pooler` URL as `url`,
direct URL as `directUrl`.

Reminder from `architecture.md`: a `Job` is a scraped posting. There is no
queue model — trigger.dev owns background work.

## Identity

```prisma
model User {
  id             String    @id @default(cuid())
  clerkId        String    @unique
  email          String    @unique
  firstName      String?
  lastName       String?
  imageUrl       String?
  onboardedAt    DateTime?
  activeResumeId String?   @unique
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  activeResume Resume?       @relation("ActiveResume", fields: [activeResumeId], references: [id])
  resumes      Resume[]      @relation("UserResumes")
  preferences  Preferences?
  matches      Match[]
  applications Application[]
  scanRuns     ScanRun[]
  artifacts    Artifact[]
}
```

`activeResumeId` on `User` enforces "one active CV" without a partial
unique index, which Prisma models awkwardly.

```prisma
model Preferences {
  id                String      @id @default(cuid())
  userId            String      @unique
  targetRoles       String[]
  locations         String[]
  remoteOnly        Boolean     @default(false)
  employmentTypes   String[]
  seniority         Seniority?
  minSalary         Int?
  salaryCurrency    String      @default("INR")
  keywords          String[]
  excludeKeywords   String[]
  excludedCompanies String[]
  sources           JobSource[]
  maxJobsPerScan    Int         @default(40)
  autoEvaluate      Boolean     @default(true)

  autoScanEnabled         Boolean   @default(false)
  autoScanIntervalMinutes Int       @default(60)
  autoScanScheduleId      String?
  lastAutoScanAt          DateTime?

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Auto-scan uses **per-user trigger.dev schedules**, not one global cron. When
a user sets `autoScanEnabled`, `upsertPreferences` calls
`syncAutoScanSchedule` (`lib/scan/autoScanSchedule.ts`), which
`schedules.create`s a CRON schedule attached to the `auto-scan-sweep` task
(`deduplicationKey: autoscan:<userId>`, `externalId: <userId>`, cron derived
from `autoScanIntervalMinutes`) and stores its id in `autoScanScheduleId`.
Turning the toggle off `schedules.del`s it. The `auto-scan-sweep` task has
**no declarative cron** — it only ever runs for a user whose schedule fired,
scanning just that user, restricted to the unmetered sources (Greenhouse /
Lever / Ashby / RemoteOK). Allowed intervals are a fixed set (15 min … 1
day); `lib/validation/preferences.ts` rejects anything else.

Separate from `User` because it is a wide, entirely optional blob written
by one screen and read by exactly one consumer — the scan planner.

## Resume

```prisma
model Resume {
  id           String      @id @default(cuid())
  userId       String
  label        String      @default("CV")
  fileName     String
  mimeType     String
  sizeBytes    Int
  pageCount    Int?
  rawText      String      @db.Text
  charCount    Int
  structured   Json?
  structuredAt DateTime?
  parseStatus  ParseStatus @default(PARSED)
  parseSource  ParseSource @default(PDF_PARSE)
  parseError   String?
  createdAt    DateTime    @default(now())

  user          User   @relation("UserResumes", fields: [userId], references: [id], onDelete: Cascade)
  activeForUser User?  @relation("ActiveResume")
  matches       Match[]

  @@index([userId, createdAt(sort: Desc)])
}
```

`rawText` is the normalized extraction (5–20 KB). `structured` is the
Claude-extracted skills / experience / education JSON, written
asynchronously. `parseSource` records which of the three paths produced
the text — `pdf-parse`, Claude's native document block, or user paste.

## Job

```prisma
model Job {
  id            String  @id @default(cuid())
  source        JobSource
  sourceId      String
  dedupeKey     String  @unique

  title          String
  company        String
  companyDomain  String?
  location       String?
  countryCode    String?
  isRemote       Boolean    @default(false)
  employmentType String?
  seniority      Seniority?

  descriptionText  String  @db.Text
  descriptionChars Int
  salaryMin        Int?
  salaryMax        Int?
  salaryCurrency   String?
  salaryPeriod     String?

  applyUrl    String   @db.Text
  sourceUrl   String?  @db.Text
  postedAt    DateTime?
  firstSeenAt DateTime @default(now())
  lastSeenAt  DateTime @default(now())
  seenCount   Int      @default(1)
  raw         Json

  firstSeenInScanRunId String?
  firstSeenInScanRun   ScanRun? @relation(fields: [firstSeenInScanRunId], references: [id], onDelete: SetNull)

  matches      Match[]
  applications Application[]
  artifacts    Artifact[]

  @@unique([source, sourceId])
  @@index([postedAt(sort: Desc)])
  @@index([company])
  @@index([firstSeenInScanRunId])
}
```

`applyUrl` is always present and always external. We never submit; we
link.

### Deduplication

`dedupeKey` is a sha256 hex of three normalized fields. The recipe lives
in `lib/sources/dedupe.ts` and is the canonical definition:

```
norm(s)     = s.toLowerCase().normalize("NFKD")
                .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()

companyKey  = norm(company)
                .replace(/\b(inc|llc|ltd|limited|gmbh|corp|co|plc|sa|bv|ag|pvt|private)\b/g, "")
                .trim()

titleKey    = norm(title)          // seniority tokens KEPT — "senior" is meaningful

locationKey = norm((city ?? location ?? "").split(",")[0])
              // "Bengaluru, KA" -> "bengaluru"
              // isRemote with no city -> "remote"

dedupeKey   = sha256(`${companyKey}|${titleKey}|${locationKey}`)
```

Ingest is a single upsert:

```ts
prisma.job.upsert({ where: { dedupeKey }, create: {...}, update: {...} })
```

**Two unique constraints coexist deliberately.**
`@@unique([source, sourceId])` is provider-level integrity — the same
Adzuna ad can never be inserted twice. `dedupeKey @unique` is the write
path.

The rule that makes them non-conflicting: **the update branch must not
touch `source` or `sourceId`.** First-seen provenance wins. It updates
only `descriptionText`, salary fields, `postedAt`, `lastSeenAt`,
`seenCount: { increment: 1 }`, and `raw`. So when JSearch returns a
posting Adzuna already gave us, it refreshes the existing row and never
rewrites the provenance pair.

**Known tradeoff.** This collapses two genuinely distinct openings with
the same title, company, and city into one row. For a job-search filter
that is the desirable behavior — the user does not want to see the same
role twice. For a job board it would be wrong.

## Match

```prisma
model Match {
  id                  String         @id @default(cuid())
  userId              String
  jobId               String
  resumeId            String

  status              MatchStatus    @default(PENDING)
  triggerRunId        String?
  failureReason       String?        @db.Text

  score               Int?
  recommendation      Recommendation?
  modelRecommendation Recommendation?

  dimRoleFit         Int?
  dimSkillsMatch     Int?
  dimExperienceDepth Int?
  dimDomainContext   Int?
  dimLogistics       Int?

  summary           String?         @db.Text
  strengths         Json?
  gaps              Json?
  cvTips            Json?
  requirements      Json?
  legitimacyTier    LegitimacyTier?
  legitimacySignals Json?
  scoreCapApplied   String?

  raw           Json?
  model         String?
  promptVersion String?
  inputTokens   Int?
  outputTokens  Int?
  cachedTokens  Int       @default(0)
  costUsd       Decimal?  @db.Decimal(10, 6)
  latencyMs     Int?
  evaluatedAt   DateTime?
  createdAt     DateTime  @default(now())

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  job         Job          @relation(fields: [jobId], references: [id], onDelete: Cascade)
  resume      Resume       @relation(fields: [resumeId], references: [id])
  application Application?

  @@unique([userId, jobId])
  @@index([userId, score(sort: Desc)])
  @@index([userId, recommendation, score(sort: Desc)])
  @@index([userId, status])
}
```

Three things worth stating explicitly:

**The row is created at trigger time**, `PENDING`, with a `triggerRunId`
and no scores. Every result field is nullable for exactly this reason.
The feed renders a progress state against a real row rather than an
absence. `@@unique([userId, jobId])` is therefore also the idempotency
guard — a second Evaluate click hits the existing row instead of firing
a second paid call.

**Dimension sub-scores are five real `Int` columns**, not JSON. The feed
sorts and filters on them and Postgres can index them.

**One live evaluation per user per job.** Re-evaluating with a new CV
overwrites; `resumeId` and `evaluatedAt` let the UI say "evaluated
against an older CV". Keeping history would mean
`@@unique([userId, jobId, resumeId])` and a lateral "latest per job" join
in every feed query — not worth it here.

`model`, `promptVersion`, token counts, and `costUsd` are cheap to record
now and are what make "why did the scores change" answerable later.

## Tracker

```prisma
model Application {
  id              String            @id @default(cuid())
  userId          String
  jobId           String
  matchId         String?           @unique

  status          ApplicationStatus @default(EVALUATED)
  statusChangedAt DateTime          @default(now())
  boardOrder      Int               @default(0)

  appliedAt      DateTime?
  nextFollowUpAt DateTime?
  lastContactAt  DateTime?
  notes          String?  @db.Text
  outcomeNote    String?  @db.Text
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user      User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  job       Job                @relation(fields: [jobId], references: [id], onDelete: Cascade)
  match     Match?             @relation(fields: [matchId], references: [id], onDelete: SetNull)
  events    ApplicationEvent[]
  artifacts Artifact[]

  @@unique([userId, jobId])
  @@index([userId, status, boardOrder])
  @@index([userId, nextFollowUpAt])
}

model ApplicationEvent {
  id            String             @id @default(cuid())
  applicationId String
  type          EventType
  fromStatus    ApplicationStatus?
  toStatus      ApplicationStatus?
  message       String?            @db.Text
  payload       Json?
  createdAt     DateTime           @default(now())

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId, createdAt(sort: Desc)])
}
```

`statusChangedAt` is what feeds the Kanban card's days-in-status mono
value. It cannot be an afterthought. See `application-states.md` for the
transactional rule that keeps it and the event log in sync.

`boardOrder` gives cards a position within a column.

## Artifacts

```prisma
model Artifact {
  id            String       @id @default(cuid())
  userId        String
  kind          ArtifactKind
  applicationId String?
  jobId         String?
  matchId       String?

  subject       String?
  content       String    @db.Text
  editedContent String?   @db.Text
  editedAt      DateTime?
  inputs        Json
  model         String
  promptVersion String
  inputTokens   Int
  outputTokens  Int
  costUsd       Decimal   @db.Decimal(10, 6)
  createdAt     DateTime  @default(now())

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  application Application? @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  job         Job?         @relation(fields: [jobId], references: [id], onDelete: SetNull)

  @@index([userId, kind, createdAt(sort: Desc)])
  @@index([applicationId])
}
```

**One polymorphic table**, not `EmailDraft` + `CvVariant` + whatever comes
next. `kind` discriminates; later phases add enum values, not tables.

`content` holds Claude's draft, `editedContent` the user's edit — null
until touched. This implements `ui-context.md`'s rule that generated text
lands in an editable field and is never read-only, while preserving the
original so "revert to generated" is possible.

`inputs` records the parameters the draft was generated from, so a result
is reproducible.

## Scan runs

```prisma
model ScanRun {
  id            String      @id @default(cuid())
  userId        String
  status        ScanStatus  @default(QUEUED)
  trigger       ScanTrigger @default(MANUAL)
  triggerRunId  String?
  querySnapshot Json
  sourcesUsed   JobSource[]

  jobsFound         Int   @default(0)
  jobsNew           Int   @default(0)
  jobsUpdated       Int   @default(0)
  jobsFiltered      Int   @default(0)
  evaluationsQueued Int   @default(0)
  sourceStats       Json?

  error      String?   @db.Text
  startedAt  DateTime?
  finishedAt DateTime?
  createdAt  DateTime  @default(now())

  user User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobs Job[]

  @@index([userId, createdAt(sort: Desc)])
}
```

`querySnapshot` freezes `Preferences` at scan time. It makes a run
reproducible and explains a stale result set after the user changes their
preferences.

`sourceStats` holds per-source `{ requests, returned, errors }`. It is
what turns a partial failure into something visible.

## Enums

```prisma
enum JobSource   { ADZUNA JSEARCH GREENHOUSE ASHBY LEVER SCRAPED FIRECRAWL MANUAL }
enum Seniority   { INTERN JUNIOR MID SENIOR STAFF LEAD PRINCIPAL }
enum Recommendation { APPLY CONSIDER SKIP }
enum LegitimacyTier { VERIFIED LIKELY_LEGITIMATE UNVERIFIED SUSPICIOUS }
enum ParseStatus { PARSED EMPTY FAILED }
enum ParseSource { PDF_PARSE CLAUDE_DOCUMENT PASTED }
enum MatchStatus { PENDING RUNNING COMPLETE FAILED }

enum ApplicationStatus {
  EVALUATED APPLIED RESPONDED INTERVIEW OFFER REJECTED DISCARDED SKIP HIRED
}
enum EventType {
  CREATED STATUS_CHANGED NOTE_ADDED ARTIFACT_GENERATED FOLLOW_UP_SENT REEVALUATED
}

enum ScanStatus   { QUEUED RUNNING SUCCEEDED PARTIAL FAILED }
enum ScanTrigger  { MANUAL SCHEDULED }
enum ArtifactKind { FOLLOW_UP_EMAIL CV_VARIANT }
```

`ApplicationStatus` mirrors career-ops's `templates/states.yml` exactly,
in that order — **the enum's declaration order is the Kanban column
order.** Terminal flags are policy and live in code, not the database:

```ts
// lib/tracker/states.ts
export const TERMINAL: ReadonlySet<ApplicationStatus> =
  new Set(["OFFER", "REJECTED", "DISCARDED", "SKIP", "HIRED"]);
```

## Size note

`Match.raw`, `Job.raw`, and `Job.descriptionText` will dominate database
size. That is fine on Neon's free tier at this scale. Do not add a fourth
JSON blob without a reason.
