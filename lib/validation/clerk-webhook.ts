import { z } from "zod";

// Clerk webhook payloads. Validated at the route boundary before anything
// trusts them — an svix-verified signature proves origin, not shape.

const emailAddress = z.object({
  id: z.string(),
  email_address: z.string().min(1),
});

const userData = z.object({
  id: z.string().min(1),
  email_addresses: z.array(emailAddress).default([]),
  primary_email_address_id: z.string().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  image_url: z.string().nullish(),
});

const deletedData = z.object({
  id: z.string().min(1),
  deleted: z.boolean().optional(),
});

export const clerkWebhookEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("user.created"), data: userData }),
  z.object({ type: z.literal("user.updated"), data: userData }),
  z.object({ type: z.literal("user.deleted"), data: deletedData }),
]);

export type ClerkWebhookEvent = z.infer<typeof clerkWebhookEvent>;
export type ClerkUserData = z.infer<typeof userData>;

export function primaryEmail(data: ClerkUserData): string | null {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id,
  );
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? null;
}
