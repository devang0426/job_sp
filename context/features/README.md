# Features

One file per implementable unit. Build them in order — the sequence is
deliberate, not arbitrary.

Each file carries a goal, explicit in/out scope, an implementation
outline, the files it touches, and a verification step that must actually
be run before the feature is called done.

| # | Feature | Depends on |
| - | ------- | ---------- |
| 01 | [Project foundation](feature-01-project-foundation.md) | — |
| 02 | [UI foundation](feature-02-ui-foundation.md) | 01 |
| 03 | [Auth with Clerk](feature-03-auth-clerk.md) | 01, 02 |
| 04 | [Data schema](feature-04-data-schema.md) | 01, 03 |
| 05 | [Score meter](feature-05-score-meter.md) | 02 |
| 06 | [Job feed](feature-06-job-feed.md) | 04, 05 |
| 07 | [Background jobs](feature-07-background-jobs.md) | 04 |
| 08 | [Resume upload](feature-08-resume-upload.md) | 04 |
| 09 | [Resume parser](feature-09-resume-parser.md) | 07, 08 |
| 10 | [Preferences and onboarding](feature-10-preferences-onboarding.md) | 08 |
| 11 | [ATS board sources](feature-11-job-sources-ats.md) | 04 |
| 12 | [Job search APIs](feature-12-job-search-apis.md) | 11 |
| 13 | [Job scraper](feature-13-job-scraper.md) | 11 |
| 14 | [Scan orchestration](feature-14-scan-orchestration.md) | 07, 10, 11 |
| 15 | [Match evaluation](feature-15-match-evaluation.md) | 07, 09, 14 |
| 16 | [Match report](feature-16-match-report.md) | 05, 15 |
| 17 | [Application tracker](feature-17-application-tracker.md) | 16 |
| 18 | [Follow-up email](feature-18-followup-email.md) | 17 |
| 19 | [CV tailoring](feature-19-cv-tailoring.md) | 16 |
| 20 | [Polish and deploy](feature-20-polish-deploy.md) | all |

## Ordering rationale

**05 and 06 land the visual payoff on seeded data**, before any external
API exists. The score meter is the product's signature element; it should
be real and correct early, and it should not be blocked on a job API
quota.

**07 proves the background pipeline with a trivial task**, before
anything expensive rides on it. Debugging trigger.dev and debugging a
Claude prompt at the same time is two problems pretending to be one.

**11 comes before 12 and 13.** ATS boards are unauthenticated and
unmetered, so the whole ingestion pipeline — normalize, dedupe, filter,
upsert — is provable before a single metered call is spent.

**12 and 13 are late and optional.** JSearch and Playwright are the most
likely to break and the least load-bearing. The product is complete and
demoable without them, which is the right risk position against a
deadline.

## Definition of done

A feature is done when all of these hold:

1. Its verification step has been run, not assumed.
2. No invariant in `../architecture.md` was violated.
3. No hardcoded hex values entered the diff.
4. `npm run build` passes.
5. `../progress-tracker.md` is updated.
