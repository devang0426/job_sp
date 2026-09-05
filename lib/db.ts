import { PrismaClient } from "@prisma/client";

// Cache the client on globalThis so hot lambdas reuse one client rather than
// opening a connection pool per invocation. See context/architecture.md.
//
// Neon's PgBouncer pooler drops idle connections after ~5 minutes.
// Without pool configuration the cached client tries to reuse a dead
// socket and throws "Error { kind: Closed, cause: None }".
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // Prisma's internal pool config — keep connections short-lived so
    // stale Neon connections are recycled instead of reused.
    datasourceUrl: process.env.DATABASE_URL,
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

