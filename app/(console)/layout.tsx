import { redirect } from "next/navigation";
import { Nav } from "@/components/shell/Nav";
import { StatusBar } from "@/components/shell/StatusBar";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { getStatusCounters } from "@/lib/tracker/counters";

// The dispatch console shell: fixed 220px nav, 40px status bar, content
// scrolls beneath both. Entering the console is also where the JIT User
// row is guaranteed — this is the path local development relies on.
export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    throw error;
  }

  if (!user.onboardedAt) {
    redirect("/onboarding");
  }

  // Rendered server-side so the counters arrive with the page. The bar
  // refreshes them on its own afterwards; without this they flash zero.
  const counters = await getStatusCounters(user.id);

  return (
    <div className="flex h-screen overflow-hidden">
      <Nav />
      <div className="flex min-w-0 flex-1 flex-col">
        <StatusBar initialCounters={counters} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
