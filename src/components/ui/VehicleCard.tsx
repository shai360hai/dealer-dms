import { Link } from "react-router";
import { Gauge, Zap, Fuel } from "lucide-react";
import { Card } from "./Card";
import { VehicleStatusBadge } from "./Badge";
import { SpecStrip } from "./SpecStrip";
import { formatMileage, formatPrice } from "../../lib/format";
import { cn } from "./cn";
import { sizedImageUrl, IMAGE_SIZES } from "../../lib/image-size";
import type { Vehicle, VehicleImage, FuelType, TransmissionType } from "../../types/database";

const TRANSMISSION_LABEL: Record<TransmissionType, string> = { manual: "ידני", automatic: "אוטומטי", cvt: "CVT", dct: "DCT" };
const FUEL_LABEL: Record<FuelType, string> = { petrol: "בנזין", diesel: "דיזל", hybrid: "היברידי", plugin_hybrid: "נטען", electric: "חשמלי" };

export function VehicleCard({
  vehicle,
  coverImage,
  className,
}: {
  vehicle: Vehicle;
  coverImage?: VehicleImage;
  className?: string;
}) {
  const isEv = vehicle.fuel_type === "electric" || vehicle.fuel_type === "plugin_hybrid";
  return (
    <Card
      className={cn(
        "group overflow-hidden transition-[transform,box-shadow] duration-300 ease-[var(--ease-signature)] hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]",
        className,
      )}
    >
      <Link to={`/vehicles/${vehicle.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-ink-soft)]">
          {coverImage ? (
            <img
              src={sizedImageUrl(coverImage.url, IMAGE_SIZES.card)}
              alt={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
              className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-signature)] group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-steel)]">אין תמונה זמינה</div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="absolute end-3 top-3">
            <VehicleStatusBadge status={vehicle.status} />
          </div>
        </div>
        <div className="p-4">
          <p className="font-[family-name:var(--font-display)] text-lg leading-tight text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-navy)]">
            {vehicle.brand} {vehicle.model}
            {vehicle.trim ? ` ${vehicle.trim}` : ""}
          </p>
          <p className="mt-0.5 text-sm text-[var(--color-steel-dark)]">{vehicle.year}</p>
          <p className="mt-2 font-[family-name:var(--font-mono)] text-xl font-semibold text-[var(--color-navy)]">{formatPrice(vehicle.price)}</p>
          <SpecStrip
            className="mt-3 border-t border-[var(--color-steel)]/70 pt-3"
            specs={[
              { icon: <Gauge size={12} />, label: "קילומטראז׳", value: formatMileage(vehicle.mileage) },
              isEv
                ? { icon: <Zap size={12} />, label: "טווח", value: vehicle.driving_range ? `${vehicle.driving_range} ק״מ` : "—" }
                : { icon: <Fuel size={12} />, label: "סוג דלק", value: FUEL_LABEL[vehicle.fuel_type] },
              { label: "תיבת הילוכים", value: TRANSMISSION_LABEL[vehicle.transmission] },
            ]}
          />
        </div>
      </Link>
    </Card>
  );
}
