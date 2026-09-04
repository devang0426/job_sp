# Feature 03 — Auth with Clerk

**Depends on:** 01, 02
**Status:** done

## Goal

Clerk owns identity. Every authenticated request resolves to a Prisma
`User` row, reliably, in both local development and production.

The mapping between Clerk and Prisma is where this feature earns its
keep. Three known failure modes are pre-empted below; all three are cheap
to prevent and expensive to discover later.

## In scope

- `ClerkProvider`, middleware, sign-in and sign-up routes.
- Route protection for the `(console)` group.
- `lib/auth.ts` — `requireUser()`.
- `POST /api/webhooks/clerk` with svix verification.

## Out of scope

- Onboarding UI. That is feature 10.
- Organizations, roles, or invitations. Single-user accounts only.

## Implementation

### The mapping rule

**`clerkId` is a unique column, not the primary key.** Every foreign key
in the schema points at the cuid `id`. Using Clerk's `user_xxx` id as a
primary key would pin the whole schema to a vendor's id format.

### Two creation paths, both required

```ts
// lib/auth.ts
export async function requireUser(): Promise<User> {
  const { userId } = await auth();
  if (!userId) throw new UnauthorizedError();

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  return prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId, email: primaryEmail(clerkUser), ... },
    update: {},
  });
}
```

1. **The webhook** handles `user.created`, `user.updated`, and
   `user.deleted`, verified with `svix` against
   `CLERK_WEBHOOK_SIGNING_SECRET`.
2. **`requireUser()` JIT-upserts** on first authenticated request.

Both are necessary. **The webhook alone is not enough** — local
development has no public URL, so a developer who signs up locally would
have no `User` row and every route would fail with a foreign key error
that looks like a schema bug.

**They can race on first sign-in.** Both paths use `upsert` on `clerkId`,
and both catch Prisma's `P2002` unique violation as a no-op rather than
an error.

### The webhook route

`app/api/webhooks/clerk/route.ts`, `runtime = "nodejs"`. Must be a public
route in the middleware matcher — Clerk's servers do not carry a session.
Verify the svix signature **before** parsing the body; an unverified
webhook body is untrusted input.

`user.deleted` soft-deletes rather than cascading. Losing a user's match
history to a mis-fired webhook is not recoverable.

### Route protection

`middleware.ts` protects everything under `(console)` and `/api` except
the webhook and `/api/health`.

## Files

- `middleware.ts`
- `app/layout.tsx` (add `ClerkProvider`)
- `app/sign-in/[[...sign-in]]/page.tsx`
- `app/sign-up/[[...sign-up]]/page.tsx`
- `lib/auth.ts`
- `app/api/webhooks/clerk/route.ts`

## Verification

1. Signing up with a fresh email creates **exactly one** `User` row.
   Check the count in Prisma Studio — not zero, not two.
2. Signing out and back in creates **zero** new rows.
3. Visiting a `(console)` route signed out redirects to sign-in.
4. `GET /api/health` still works signed out.
5. Deleting the `User` row while signed in, then reloading, recreates it
   via the JIT path. This is the local-development scenario; it must
   work.
6. `npm run build` passes.

## Notes

- Sign-in and sign-up pages should inherit the token palette rather than
  Clerk's default theme. Clerk's `appearance` prop takes CSS variables.
- The webhook cannot be tested locally without a tunnel. That is fine —
  the JIT path is what covers local development, and step 5 verifies it.
