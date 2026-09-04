import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ChipSize = "sm" | "md";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: ChipSize;
}

const SIZES: Record<ChipSize, string> = {
  sm: "h-7 px-3 text-[11.5px]",
  md: "h-8.5 px-4 text-xs",
};

export function Chip({
  active = false,
  size = "sm",
  className,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium tracking-normal select-none",
        "transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        SIZES[size],
        active
          ? "bg-accent text-white font-semibold shadow-xs"
          : "bg-white text-text-secondary hover:text-text-primary hover:bg-slate-100 border border-border-default/80",
        className,
      )}
      {...props}
    />
  );
}


