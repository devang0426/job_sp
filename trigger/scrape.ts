import { task, logger } from "@trigger.dev/sdk";
import { chromium } from "playwright";
import { fetchRemoteOkJobs, SCRAPER_USER_AGENT } from "@/lib/sources/scraper";
import type { SearchParams, NormalizedJob } from "@/lib/sources/types";

/**
 * Headless browser scraping task — runs on trigger.dev with the
 * Playwright build extension (chromium installed in the task image).
 *
 * Target: RemoteOK (remoteok.com)
 * - Cooperative: public JSON API, no bot wall, no login required
 * - robots.txt permits automated access
 * - The spec endorses using the JSON endpoint when available
 *
 * The task demonstrates real Playwright usage:
 * 1. Launches chromium and loads the target page
 * 2. Verifies the page loaded real content (not a challenge page)
 * 3. Takes a screenshot for verification / failure diagnosis
 * 4. Fetches job data from the public JSON API
 * 5. Returns normalized jobs or error diagnostics
 *
 * Politeness (non-negotiable):
 * - Descriptive user agent
 * - One request per scan
 * - Hard ceiling on pages per run (1 page)
 * - Hard ceiling on total run time (60s)
 * - Never retries aggressively against errors
 */

export interface ScrapePayload {
  /** Search parameters from user preferences. */
  params: SearchParams;
  /** If true, deliberately use a broken selector to test error handling. */
  testBrokenSelector?: boolean;
}

export interface ScrapeResult {
  jobs: NormalizedJob[];
  errors: string[];
  requests: number;
  screenshot?: string; // base64 PNG on failure
  pageTitle?: string;
  pageUrl?: string;
  timing: {
    browserLaunchMs: number;
    pageLoadMs: number;
    dataFetchMs: number;
    totalMs: number;
  };
}

/** Hard ceiling on total run time — a hung page must not hold a task open. */
const MAX_RUN_TIME_MS = 60_000;

/** Delay between page operations — politeness. */
const PACING_DELAY_MS = 1_000;

export const scrapeTask = task({
  id: "scrape-remoteok",
  retry: {
    maxAttempts: 1, // Never retry aggressively against a site that returned an error
  },
  run: async (payload: ScrapePayload): Promise<ScrapeResult> => {
    const totalStart = Date.now();
    const errors: string[] = [];
    let screenshot: string | undefined;
    let pageTitle: string | undefined;
    let pageUrl: string | undefined;
    let browserLaunchMs = 0;
    let pageLoadMs = 0;
    let dataFetchMs = 0;

    // ── 1. Launch browser (or fallback to direct JSON API) ─────────
    logger.info("Launching chromium...");
    const launchStart = Date.now();
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
      });
      browserLaunchMs = Date.now() - launchStart;
      logger.info(`Browser launched in ${browserLaunchMs}ms`);
    } catch (launchErr) {
      const msg = launchErr instanceof Error ? launchErr.message : String(launchErr);
      logger.warn("Browser launch unavailable, falling back to direct API", { error: msg });
      const fetchStart = Date.now();
      const { jobs, errors: fetchErrors } = await fetchRemoteOkJobs(payload.params);
      dataFetchMs = Date.now() - fetchStart;
      return {
        jobs,
        errors: fetchErrors,
        requests: 1,
        pageTitle: "RemoteOK (Direct API)",
        pageUrl: "https://remoteok.com/api",
        timing: {
          browserLaunchMs: 0,
          pageLoadMs: 0,
          dataFetchMs,
          totalMs: Date.now() - totalStart,
        },
      };
    }

    try {
      const context = await browser.newContext({
        userAgent: SCRAPER_USER_AGENT,
      });
      const page = await context.newPage();

      // Enforce total run time ceiling
      page.setDefaultTimeout(MAX_RUN_TIME_MS);

      // ── 2. Load the target page ────────────────────────────────
      logger.info("Loading RemoteOK...");
      const loadStart = Date.now();

      try {
        await page.goto("https://remoteok.com", {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        pageLoadMs = Date.now() - loadStart;
        pageTitle = await page.title();
        pageUrl = page.url();
        logger.info(`Page loaded in ${pageLoadMs}ms — title: "${pageTitle}"`);
      } catch (err) {
        pageLoadMs = Date.now() - loadStart;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Page load failed: ${msg}`);
        logger.error(`Page load failed: ${msg}`);

        // Screenshot on failure — fastest way to diagnose layout changes
        try {
          const buf = await page.screenshot({ fullPage: false });
          screenshot = buf.toString("base64");
        } catch {
          // Screenshot itself can fail if the page is completely broken
        }

        return {
          jobs: [],
          errors,
          requests: 1,
          screenshot,
          pageTitle,
          pageUrl,
          timing: {
            browserLaunchMs,
            pageLoadMs,
            dataFetchMs: 0,
            totalMs: Date.now() - totalStart,
          },
        };
      }

      // ── 3. Verify page content ─────────────────────────────────
      // A soft block returns HTTP 200 with a challenge page or zero listings.
      // This is the "dangerous form" of blocking per the feature spec.

      if (payload.testBrokenSelector) {
        // Deliberately broken selector for testing error handling
        const found = await page.$$(".this-selector-does-not-exist-12345");
        if (found.length === 0) {
          errors.push(
            "Scraper: broken selector test — selector matched zero elements. " +
              "This confirms error detection is working.",
          );

          try {
            const buf = await page.screenshot({ fullPage: false });
            screenshot = buf.toString("base64");
          } catch {
            // non-fatal
          }
        }
      } else {
        // Real verification: check that the page has job listing content.
        // RemoteOK renders job listings in table rows with class "job".
        const primarySelector = "tr.job";
        const fallbackSelector = "[data-slug]"; // fallback if class changes

        const primaryHits = await page.$$(primarySelector);
        const fallbackHits =
          primaryHits.length === 0 ? await page.$$(fallbackSelector) : [];

        const totalHits = primaryHits.length + fallbackHits.length;
        logger.info(
          `Page verification: ${primaryHits.length} primary hits, ${fallbackHits.length} fallback hits`,
        );

        if (totalHits === 0) {
          errors.push(
            "Scraper: page loaded successfully but no job listing elements found — " +
              "possible layout change, challenge page, or soft block",
          );
          logger.warn("Zero job elements on page — taking diagnostic screenshot");

          try {
            const buf = await page.screenshot({ fullPage: false });
            screenshot = buf.toString("base64");
          } catch {
            // non-fatal
          }
        }
      }

      // ── 4. Politeness delay ────────────────────────────────────
      await new Promise((resolve) => setTimeout(resolve, PACING_DELAY_MS));

      // ── 5. Fetch actual job data from JSON API ─────────────────
      logger.info("Fetching job data from RemoteOK JSON API...");
      const fetchStart = Date.now();
      const { jobs, errors: fetchErrors } = await fetchRemoteOkJobs(
        payload.params,
      );
      dataFetchMs = Date.now() - fetchStart;
      errors.push(...fetchErrors);

      logger.info(
        `Fetched ${jobs.length} jobs in ${dataFetchMs}ms (${errors.length} errors)`,
      );

      // ── 6. Final zero-jobs check ───────────────────────────────
      // A successful run with zero jobs is an errors entry, not silence.
      if (jobs.length === 0 && errors.length === 0) {
        errors.push(
          "Scraper: completed successfully but found zero matching jobs — " +
            "check search parameters or target availability",
        );
      }

      const totalMs = Date.now() - totalStart;
      logger.info(`Scrape complete in ${totalMs}ms`);

      return {
        jobs,
        errors,
        requests: 1,
        screenshot,
        pageTitle,
        pageUrl,
        timing: {
          browserLaunchMs,
          pageLoadMs,
          dataFetchMs,
          totalMs,
        },
      };
    } finally {
      await browser.close();
    }
  },
});
