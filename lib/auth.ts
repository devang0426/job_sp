import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/db";

// Thrown when there is no Clerk session. Route handlers turn this into a
// 401 via the response envelope; nothing else should catch it.
export class UnauthorizedError extends Error {
  constructor(message = "Sign in to continue.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function primaryEmailOf(clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>): string {
  const primary = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId,
  );
  const email = primary?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new UnauthorizedError("Your account has no email address.");
  }
  return email;
}

// Resolves the current Clerk session to a Prisma User row, creating it on
// first authenticated request. This is the path that covers local
// development, where the user.created webhook never fires (no public URL).
// It races with the webhook on first sign-in; both upsert on clerkId and
// treat a P2002 as a no-op. See context/architecture.md.
export const requireUser = cache(async function requireUser(): Promise<User> {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch (err) {
    if (
      (err as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE" ||
      (err as { message?: string })?.message?.includes("Dynamic server usage")
    ) {
      throw err;
    }
    console.warn("auth() failed in requireUser:", err);
    throw new UnauthorizedError();
  }
  if (!userId) throw new UnauthorizedError();

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) {
    // A live Clerk session means this user is not actually gone — revive a
    // row a mis-fired user.deleted webhook soft-deleted.
    if (existing.deletedAt) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { deletedAt: null },
      });
    }
    return existing;
  }

  let clerkUser;
  try {
    clerkUser = await currentUser();
  } catch (err) {
    if (
      (err as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE" ||
      (err as { message?: string })?.message?.includes("Dynamic server usage")
    ) {
      throw err;
    }
    console.warn("currentUser() failed in requireUser:", err);
    throw new UnauthorizedError();
  }
  if (!clerkUser) throw new UnauthorizedError();

  const email = primaryEmailOf(clerkUser);

  try {
    return await prisma.user.upsert({
      where: { clerkId: userId },
      create: {
        clerkId: userId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      },
      update: {
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        deletedAt: null,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const byClerk = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (byClerk) return byClerk;

      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        return await prisma.user.update({
          where: { id: byEmail.id },
          data: {
            clerkId: userId,
            firstName: clerkUser.firstName ?? byEmail.firstName,
            lastName: clerkUser.lastName ?? byEmail.lastName,
            imageUrl: clerkUser.imageUrl ?? byEmail.imageUrl,
            deletedAt: null,
          },
        });
      }
    }
    throw error;
  }
});

export { isUniqueViolation };
