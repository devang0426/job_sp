import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";

// Every console screen before its feature lands: a page title and an empty
// state describing what will fill it. Replaced wholesale as features ship.
export function PagePlaceholder({
  title,
  emptyLabel,
  children,
}: {
  title: string;
  emptyLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="heading text-title text-text-primary">{title}</h1>
      <EmptyState label={emptyLabel}>{children}</EmptyState>
    </div>
  );
}
