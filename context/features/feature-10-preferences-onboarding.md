# Feature 10 — Preferences and onboarding

**Depends on:** 08
**Status:** not started

## Goal

A new user goes from signed-in to ready-to-scan in one flow: upload a CV,
say what they are looking for, done.

`Preferences` is what the scan planner reads, so this feature defines the
shape of every later scan.

## In scope

- `GET` / `PATCH /api/preferences`.
- The onboarding screen: CV upload, then preferences.
- `POST /api/onboarding/complete`.
- The `onboardedAt` gate.
- A settings screen to edit preferences later.

## Out of scope

- Running the first scan — feature 14. Onboarding ends by *offering* a
  scan.

## Implementation

### The fields

Per `../data-model.md`: `targetRoles`, `locations`, `remoteOnly`,
`employmentTypes`, `seniority`, `minSalary`, `salaryCurrency`,
`keywords`, `excludeKeywords`, `excludedCompanies`, `sources`,
`maxJobsPerScan`, `autoEvaluate`.

Sensible defaults matter more than completeness. A user who fills in a
role and a location should get a good scan; everything else is
refinement. Default `sources` to the ATS boards, which cost nothing —
see feature 11.

`maxJobsPerScan` defaults to 40, hard-capped at 60. This is a cost
control, not a preference; enforce the ceiling server-side regardless of
what the client sends.

### The flow

Onboarding lives outside the console shell — it is not a board screen.

1. **Upload CV.** Reuses feature 08 entirely. Includes the paste
   fallback.
2. **Preferences.** Roles and locations first, everything else
   progressively disclosed.
3. **Done.** Sets `User.onboardedAt` and offers to run the first scan.

`POST /api/onboarding/complete` validates that a resume and preferences
both exist before stamping `onboardedAt`. Do not trust the client's
claim that it finished.

### The gate

`(console)` routes redirect to `/onboarding` when `onboardedAt` is null.
`/onboarding` redirects to the feed when it is set. One rule, both
directions — a half-implemented gate produces a redirect loop.

### Keywords versus exclusions

Worth explaining in the UI, briefly: `keywords` narrows (a posting must
match at least one when any are set), `excludeKeywords` removes. These
run in the deterministic pre-filter, before any Claude call — so every
posting they drop is money not spent. Say so in the interface; it makes
the setting feel worth filling in.

### Copy

Sentence case. Name things the way the user thinks about them: "roles
you're targeting", not "target role vector". Field help text explains
what a setting *does to their results*, not what it stores.

## Files

- `app/api/preferences/route.ts`
- `app/api/onboarding/complete/route.ts`
- `lib/validation/preferences.ts`
- `app/onboarding/page.tsx`
- `app/(console)/settings/page.tsx`
- `components/editor/PreferencesForm.tsx`

## Verification

1. A fresh user is redirected to onboarding and cannot reach the feed.
2. Completing onboarding sets `onboardedAt` and lands on the feed.
3. Revisiting `/onboarding` afterwards redirects to the feed — no loop.
4. `POST /api/onboarding/complete` refuses when no resume exists, even if
   called directly.
5. Sending `maxJobsPerScan: 500` is clamped to 60 server-side.
6. Preferences edited in settings persist and reload correctly, including
   the array fields.
7. `npm run build` passes.

## Notes

- Step 5 matters. `maxJobsPerScan` is the main guard against a scan that
  costs real money, and a client-side-only cap is not a cap.
- Resist adding fields the scan does not read. Every unused preference is
  a promise the product does not keep.
