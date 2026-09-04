"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
}

export function Field({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedBy = error
    ? `${fieldId}-error`
    : hint
      ? `${fieldId}-hint`
      : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="eyebrow text-[var(--color-text-secondary)] font-mono text-xs">
        {label}
      </label>
      <input
        id={fieldId}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={cn(
          "min-h-[44px] rounded-none border bg-[var(--color-bg-base)] px-3.5 text-sm text-[var(--color-text-primary)] font-sans",
          "placeholder:text-[var(--color-text-muted)]",
          "transition-colors duration-[180ms]",
          error ? "border-[var(--color-state-error)]" : "border-[var(--color-border-default)] focus:border-[var(--color-text-primary)]",
          className,
        )}
        {...props}
      />
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="text-xs text-[var(--color-text-muted)] font-mono">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="text-xs text-[var(--color-state-error)] font-mono">
          {error}
        </p>
      )}
    </div>
  );
}
