import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { cn } from "./cn";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "flex items-center justify-between gap-3 p-4 transition-[transform,box-shadow] duration-300 ease-[var(--ease-signature)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]",
        className,
      )}
    >
      <div>
        <p className="text-xs font-medium text-[var(--color-steel-dark)]">{label}</p>
        <p className={cn("mt-1 font-[family-name:var(--font-mono)] text-2xl font-semibold tabular-nums", accent ? "text-[var(--color-chrome-gold)]" : "text-[var(--color-navy)]")}>
          {value}
        </p>
      </div>
      {Icon ? (
        <div
          className={cn(
            "rounded-full p-2.5",
            accent
              ? "bg-[color-mix(in_srgb,var(--color-chrome-gold)_15%,white)] text-[var(--color-chrome-gold)]"
              : "bg-[color-mix(in_srgb,var(--color-navy)_10%,white)] text-[var(--color-navy)]",
          )}
        >
          <Icon size={20} strokeWidth={1.75} />
        </div>
      ) : null}
    </Card>
  );
}
