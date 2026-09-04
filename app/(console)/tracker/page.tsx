import { requireUser } from "@/lib/auth";
import { getBoardApplications } from "@/lib/db/applications";
import { Board } from "@/components/tracker/Board";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const user = await requireUser();
  const board = await getBoardApplications(user.id);

  if (board.totalCount === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <EmptyState
          label="No saved applications yet"
          action={
            <Link href="/feed">
              <Button variant="default" className="inline-flex items-center gap-2">
                Browse the job feed
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          }
        >
          Saved jobs land here as cards you move through the pipeline. Open a match report from the feed and save the ones worth pursuing.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Board
        initialColumns={board.columns}
        totalCount={board.totalCount}
      />
    </div>
  );
}
