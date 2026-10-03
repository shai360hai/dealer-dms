import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-card)] text-sm font-medium transition-[background-color,box-shadow,transform] duration-200 ease-[var(--ease-signature)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-chrome-gold)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-navy)] text-[var(--color-porcelain)] shadow-[var(--shadow-soft)] hover:bg-[var(--color-navy-light)] hover:shadow-[var(--shadow-glow-navy)]",
        gold: "bg-[var(--color-chrome-gold)] text-[var(--color-ink)] shadow-[var(--shadow-soft)] hover:bg-[var(--color-chrome-gold-soft)] hover:shadow-[var(--shadow-glow-gold)]",
        outline: "border border-[var(--color-steel)] bg-transparent text-current hover:border-[var(--color-navy)] hover:bg-[var(--color-porcelain-dim)]",
        ghost: "bg-transparent hover:bg-[var(--color-porcelain-dim)]",
        destructive: "bg-[var(--color-status-sold)] text-[var(--color-porcelain)] shadow-[var(--shadow-soft)] hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
