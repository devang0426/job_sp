import { Webhook } from "svix";
import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { isUniqueViolation } from "@/lib/auth";
import {
  clerkWebhookEvent,
  primaryEmail,
  type ClerkUserData,
} from "@/lib/validation/clerk-webhook";

// Clerk's servers don't carry a session, so this route is public in the
// middleware matcher. The svix signature is what authenticates it.
export const runtime = "nodejs";

async function upsertFromClerk(data: ClerkUserData): Promise<void> {
  const email = primaryEmail(data);
  const profile = {
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
    imageUrl: data.image_url ?? null,
  };

  try {
    const existing = await prisma.user.findUnique({
      where: { clerkId: data.id },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { ...profile, ...(email ? { email } : {}) },
      });
      return;
    }

    if (!email) return; // Can't create a row without the required email.

    await prisma.user.create({
      data: { clerkId: data.id, email, ...profile },
    });
  } catch (error) {
    // Raced with requireUser()'s JIT upsert — the row now exists. No-op.
    if (isUniqueViolation(error)) return;
    throw error;
  }
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return fail("INTERNAL", "Webhook signing secret is not configured.", 500);
  }

  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  // Verify before parsing — an unverified body is untrusted input.
  let verified: unknown;
  try {
    verified = new Webhook(secret).verify(payload, headers);
  } catch {
    return fail("VALIDATION_FAILED", "Webhook signature check failed.", 400);
  }

  const parsed = clerkWebhookEvent.safeParse(verified);
  if (!parsed.success) {
    // A verified event we don't model (there are many). Acknowledge it.
    return ok({ received: true, handled: false });
  }

  const event = parsed.data;
  switch (event.type) {
    case "user.created":
    case "user.updated":
      await upsertFromClerk(event.data);
      break;
    case "user.deleted":
      // Soft delete — losing match history to a mis-fired webhook is not
      // recoverable.
      await prisma.user.updateMany({
        where: { clerkId: event.data.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      break;
  }

  return ok({ received: true, handled: true });
}
