import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "ghost" | "danger" | "accent" | "subtle" | "secondary";
type Size = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  default:
    "bg-text-primary text-white hover:bg-slate-800 shadow-xs active:scale-[0.98]",
  accent:
    "bg-accent text-white hover:bg-accent-hover shadow-xs active:scale-[0.98] font-semibold",
  secondary:
    "bg-blue-50 text-accent hover:bg-blue-100 border border-blue-200/80 font-semibold active:scale-[0.98]",
  ghost:
    "bg-transparent text-text-primary hover:bg-slate-100 active:bg-slate-200 border border-border-default",
  subtle:
    "bg-bg-surface text-text-secondary border border-border-default hover:border-border-strong hover:text-text-primary hover:bg-slate-50 shadow-2xs",
  danger:
    "bg-rose-50 text-state-error border border-rose-200 hover:bg-rose-100",
};

const SIZES: Record<Size, string> = {
  xs: "h-7 px-2.5 text-[11px] font-medium tracking-normal",
  sm: "h-8.5 px-3.5 text-xs font-medium tracking-normal",
  md: "h-10 px-4.5 text-xs font-semibold tracking-normal",
  lg: "h-11 px-6 text-sm font-semibold tracking-normal",
};

export function Button({
  variant = "default",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg select-none cursor-pointer",
        "transition-all duration-150 ease-out",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}


