import { cn } from "@/lib/cn";

type Tone = "neutral" | "apply" | "consider" | "skip" | "error" | "success" | "warning" | "info";

const TONES: Record<Tone, string> = {
  neutral:
    "border-slate-200 bg-slate-100/80 text-slate-700",
  apply:
    "border-emerald-200 bg-emerald-50 text-emerald-700 font-bold",
  consider:
    "border-blue-200 bg-blue-50 text-blue-700 font-semibold",
  skip:
    "border-slate-200 bg-slate-100 text-slate-500",
  error:
    "border-rose-200 bg-rose-50 text-rose-700 font-medium",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 font-medium",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 font-medium",
  info:
    "border-sky-200 bg-sky-50 text-sky-700 font-medium",
};

interface StatusChipProps {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function StatusChip({
  tone = "neutral",
  children,
  className,
  title,
}: StatusChipProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-semibold tracking-tight transition-colors select-none",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}


