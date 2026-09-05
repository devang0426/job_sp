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
  return new PrismaClient({
    log: ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Always keep on globalThis so both warm serverless lambdas and dev HMR reuse a single instance
globalForPrisma.prisma = prisma;
