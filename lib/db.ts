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

function getDatasourceUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    // If connected to Neon pooler or any PgBouncer endpoint, ensure parameters are set
    if (url.hostname.includes("-pooler") || url.searchParams.has("pgbouncer") || url.port === "6543") {
      url.searchParams.set("pgbouncer", "true");
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set("connection_limit", process.env.NODE_ENV === "production" ? "5" : "10");
      }
      if (!url.searchParams.has("pool_timeout")) {
        url.searchParams.set("pool_timeout", "15");
      }
      if (!url.searchParams.has("connect_timeout")) {
        url.searchParams.set("connect_timeout", "15");
      }
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: ["error"],
    datasourceUrl: getDatasourceUrl(),
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Always keep on globalThis so both warm serverless lambdas and dev HMR reuse a single instance
globalForPrisma.prisma = prisma;
