# Feature 13 — Job scraper

**Depends on:** 11
**Status:** not started

## Goal

A real headless-browser scraper, running as a trigger.dev task, feeding
the same adapter interface as every other source.

This is the feature that makes "job scraper" literally true rather than
"job API client". It is deliberately last among the sources: most likely
to break, least load-bearing.

## In scope

- `playwright` and the trigger.dev Playwright build extension.
- One scraper adapter against one chosen target.
- Selector resilience and failure reporting.
- Politeness: rate limiting, a real user agent, robots awareness.

## Out of scope

- Scraping multiple sites. One target, done well.
- Anything requiring a login, a CAPTCHA solve, or bot-detection evasion.
  If a site does not want to be read by a script, that is the answer.
- Rotating or residential proxies, CAPTCHA-solving services, stealth /
  fingerprint-spoofing plugins, headless-detection evasion. That is an
  adversarial arms race — against every target's terms of service, and
  the wrong thing to demonstrate. See the security section below.

## Implementation

### Why this runs on trigger.dev

**Playwright cannot run on Vercel serverless.** There is no browser in
the runtime and no way to install one within the function size limit.

trigger.dev tasks run in their own containers, and the official
Playwright build extension installs the browser binaries into the task
image:

```ts
// trigger.config.ts
import { playwright } from "@trigger.dev/build/extensions/playwright";

build: {
  extensions: [playwright({ browsers: ["chromium"], headless: true })],
}
```

**Pin Playwright to `1.57.0`.** The build extension breaks on 1.58+
during the Docker image build. This is a known issue, and the failure
message does not point at the version.

Install chromium only. Installing all three browsers triples the image
size and the build time for no benefit.

### Choosing a target

Decide at implementation time, not before. Criteria, in order:

1. **Not LinkedIn, Indeed, or Naukri.** Those are precisely the hostile
   targets — they run commercial anti-bot systems (DataDome,
   PerimeterX), they challenge datacenter IPs on sight, and LinkedIn
   actively litigates against scrapers. The ATS adapters already cover
   the serious ingestion; this feature is a demonstration of technique,
   so it needs a cooperative target, not a fight.
2. **Stable, server-rendered markup.** A site that renders listings into
   the initial HTML is far easier to scrape reliably than one that
   assembles them from a private JSON API in the client.
3. **No login required** to view listings.
4. **Permits automated reading** — check `robots.txt` and the terms
   before writing a selector.
5. Job listings actually relevant to the user's target roles and
   locations.

Good candidates: a smaller regional aggregator, a government job board, a
niche or sector-specific board. What they have in common is no clean API
and no commercial bot wall.

If a candidate site turns out to be a client-rendered SPA calling a
public JSON endpoint, use that endpoint. That is a better scraper, not a
worse one.

Record the chosen target and why in `../progress-tracker.md`.

### Security and IP blocking

**Where the task runs decides the whole problem.** On trigger.dev the
Playwright task egresses from trigger.dev's cloud — shared datacenter
IPs (AWS ranges), with no dedicated egress IP on the free tier. Two
consequences:

- Datacenter IP ranges are the first signal every anti-bot system
  checks. A target that tolerates a residential IP may block the same
  request from AWS.
- The IP is **shared** across trigger.dev customers. Someone else's
  scraping can get it rate-limited or challenged before your task runs,
  and your scraping affects them. Keep the footprint small — this is
  another reason for the one-request-per-second pacing and the page
  ceiling, not just politeness.

Running Playwright locally in development uses your own residential IP —
less likely to be blocked outright, but there is no deployment path and
you are spending your own IP's reputation. The cloud tradeoff is the
right one for a deployable product; just know which IP is making the
request.

**Blocking has a soft form, and it is the dangerous one.** A `403` or
`429` is easy — the adapter returns it as an `errors` value and the scan
continues as `PARTIAL`. The trap is a block that returns HTTP `200`: a
"verify you are human" interstitial, or a page that loads fine and
simply contains zero listings. The rule in the Resilience section — *a
successful load with zero jobs is an `errors` entry, not an empty
success* — is the control that catches this. Treat it as a security
requirement, not a nicety.

**The line this feature does not cross.** No proxy rotation, no
residential proxy networks, no CAPTCHA-solving services, no stealth
plugins, no fingerprint randomization, no headless-detection evasion.
Each of those turns polite automated access into adversarial evasion:
against the target's terms of service, legally exposed, and exactly the
wrong thing to show a grader. The honest answer to "how would this
survive being blocked at scale" is *move to official APIs or a data
partnership* — which is what the ATS adapters already are.

**If the target blocks the scraper mid-project, that is expected.** Fix
the selector, or change target. Never let a blocked scraper hold up a
demo — the ATS sources carry the product without it.

### Politeness

Non-negotiable, and worth saying in the code:

- A descriptive user agent.
- A delay between page loads — one request per second at most.
- A hard ceiling on pages per run.
- Honor `robots.txt`.
- Never retry aggressively against a site that returned an error.

This is a college assignment reading public listings, not a crawler.
Behave like one.

### Resilience

Selectors break. Assume it:

- Extract with a primary selector and one fallback where reasonable.
- If a page yields zero jobs but loaded successfully, that is an `errors`
  entry — **not** an empty success. Silent zero is the failure mode that
  hides a broken scraper for weeks.
- Screenshot on failure into the run's output. It is the fastest way to
  see that a layout changed.
- Cap total run time. A hung page must not hold a task open.

### The adapter contract

Same as every other source. Produces `NormalizedJob[]`, returns errors as
values, never throws. `source: SCRAPED`, `sourceId` derived from the
posting's own stable identifier — never from its list position.

## Files

- `trigger.config.ts` (add the extension)
- `trigger/scrape.ts`
- `lib/sources/scraper.ts`
- `package.json` (pin `playwright@1.57.0`)

## Verification

1. `npx trigger.dev@latest deploy` builds the image successfully with the
   Playwright extension. **If it fails, check the Playwright version
   first.**
2. The task launches chromium and loads the target page in the deployed
   environment, not only locally. Confirm the deployed run gets real page
   content, not a challenge page — the datacenter IP is a different
   request than your laptop.
3. It returns real postings with working apply links.
4. A deliberately broken selector produces an `errors` entry and a
   screenshot — not a silent empty result.
5. A page that loads successfully but contains no listings is also an
   `errors` entry, not an empty success. Force this and confirm.
6. Request pacing is observable in the logs: roughly one page per second,
   not a burst.
7. The run respects its page ceiling and its time ceiling.
8. Scraped jobs dedupe correctly against the same postings from other
   sources.
9. `npm run build` passes.

## Notes

- Step 1 is where the time goes. Build and deploy the empty task with the
  extension **before** writing a single selector — proving the image
  builds is a separate problem from proving the scrape works, and
  debugging them together is miserable.
- If the target site changes layout mid-project, that is expected. Fix
  the selector, or change target. Do not let a broken scraper block a
  demo — the ATS sources carry the product on their own.
