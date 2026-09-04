import type { ReactNode } from "react";

interface EmptyStateProps {
  label: string;
  children: ReactNode;
  action?: ReactNode;
}

// A Barlow Condensed label, one Archivo sentence explaining what will fill
// the space, and the action that fills it. Never an illustration.
export function EmptyState({ label, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded border border-border-default bg-bg-surface p-6">
      <p className="eyebrow text-text-muted">{label}</p>
      <p className="max-w-prose text-body text-text-secondary">{children}</p>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
