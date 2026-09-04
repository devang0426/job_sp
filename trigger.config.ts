import { defineConfig } from "@trigger.dev/sdk/v3";
import { playwright } from "@trigger.dev/build/extensions/playwright";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { additionalFiles } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_gbjseymlpabqvtdlfocs",
  runtime: "node",
  logLevel: "log",
  maxDuration: 300,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 5000,
      factor: 2,
      randomize: true,
    },
  },
  build: {
    // playwright-core lazily requires chromium-bidi for its WebDriver BiDi
    // transport. The scraper drives Chromium over CDP and never touches it,
    // and the package is not installed, so leave it unbundled rather than
    // adding a dependency nothing calls.
    external: ["chromium-bidi"],
    extensions: [
      // Tasks run on trigger.dev's infrastructure, not Vercel, so nothing
      // outside the bundle exists at runtime. Each extension below puts one
      // required thing into the task image.

      // Generates the Prisma client and ships its query engine. Without it
      // every task that touches the database crashes on import.
      prismaExtension({ mode: "legacy", schema: "./prisma/schema.prisma" }),

      // config/portals.yml is read at scan time via process.cwd(). It is
      // data, not code, so the bundler does not pick it up on its own.
      additionalFiles({ files: ["config/portals.yml"] }),

      // Chromium for the scraper task. Pinned to Playwright 1.57.0 — the
      // extension breaks on 1.58+.
      playwright({ browsers: ["chromium"], headless: true }),
    ],
  },
  dirs: ["./trigger"],
});
