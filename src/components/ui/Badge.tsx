import * as React from "react";
import { cn } from "./cn";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "gold" | "available" | "reserved" | "sold" }) {
  const toneClasses: Record<string, string> = {
    neutral: "bg-[var(--color-porcelain-dim)] text-[var(--color-ink)]",
    gold: "bg-[var(--color-chrome-gold-soft)] text-[var(--color-ink)]",
    available: "bg-[color-mix(in_srgb,var(--color-status-available)_15%,white)] text-[var(--color-status-available)]",
    reserved: "bg-[color-mix(in_srgb,var(--color-status-reserved)_15%,white)] text-[var(--color-status-reserved)]",
    sold: "bg-[color-mix(in_srgb,var(--color-status-sold)_15%,white)] text-[var(--color-status-sold)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:opacity-70",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

const VEHICLE_STATUS_LABEL: Record<string, string> = { available: "זמין", reserved: "שמור", sold: "נמכר" };
const VEHICLE_STATUS_TONE: Record<string, "available" | "reserved" | "sold"> = { available: "available", reserved: "reserved", sold: "sold" };

export function VehicleStatusBadge({ status }: { status: string }) {
  return <Badge tone={VEHICLE_STATUS_TONE[status]}>{VEHICLE_STATUS_LABEL[status]}</Badge>;
}

const INQUIRY_STATUS_LABEL: Record<string, string> = { new: "חדש", contacted: "נוצר קשר", closed: "סגור" };
const INQUIRY_STATUS_TONE: Record<string, "reserved" | "available" | "neutral"> = { new: "reserved", contacted: "available", closed: "neutral" };

export function InquiryStatusBadge({ status }: { status: string }) {
  return <Badge tone={INQUIRY_STATUS_TONE[status]}>{INQUIRY_STATUS_LABEL[status]}</Badge>;
}
