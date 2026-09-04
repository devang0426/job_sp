import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/api";

// Touches Prisma, so it cannot run on Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Proves the database is reachable from a Vercel-shaped runtime.
export async function GET() {
  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Math.round(performance.now() - startedAt);
    return ok({ ok: true, dbLatencyMs });
  } catch {
    return fail(
      "INTERNAL",
      "Couldn't reach the database. Check DATABASE_URL and that the Neon compute is awake.",
      503,
    );
  }
}
