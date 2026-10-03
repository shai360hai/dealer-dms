import * as React from "react";
import { cn } from "./cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      dir="rtl"
      className={cn(
        "h-10 w-full rounded-[calc(var(--radius-card)*0.6)] border border-[var(--color-steel)] bg-white px-3 text-sm text-[var(--color-ink)] shadow-[var(--shadow-soft)] transition-shadow duration-200 placeholder:text-[var(--color-steel-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] focus-visible:ring-offset-1 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-sm font-medium text-[var(--color-ink)]", className)} {...props} />;
}
