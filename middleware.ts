import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public: the auth screens, the health probe (no session), and the Clerk
// webhook (Clerk's servers don't carry a session). Everything else —
// the (console) group and the rest of /api — requires a signed-in user.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/webhooks/clerk",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files unless referenced in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ico|woff2?|ttf|webp|avif|map)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
