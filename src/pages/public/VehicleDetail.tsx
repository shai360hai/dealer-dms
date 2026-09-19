import { useEffect } from "react";
import { useParams, Link } from "react-router";
import { Phone, MessageCircle, CalendarCheck } from "lucide-react";
import { VehicleCard, VehicleStatusBadge, SpecStrip } from "../../components/ui";
import { Gallery } from "../../components/Gallery";
import { FavoriteButton, ShareButton } from "../../components/FavoriteShareButtons";
import { CompareButton } from "../../components/CompareButton";
import { InquiryForm } from "../../components/InquiryForm";
import { useVehicleBySlug, useSimilarVehicles } from "../../hooks/useVehicles";
import { formatPrice, formatMileage } from "../../lib/format";
import { sortByAngle, ANGLE_LABEL } from "../../lib/angles";
import type { FuelType, TransmissionType, DriveType } from "../../types/database";

const FUEL_LABEL: Record<FuelType, string> = { petrol: "בנזין", diesel: "דיזל", hybrid: "היברידי", plugin_hybrid: "נטען (Plug-in)", electric: "חשמלי" };
const TRANSMISSION_LABEL: Record<TransmissionType, string> = { manual: "ידני", automatic: "אוטומטי", cvt: "CVT", dct: "DCT" };
const DRIVE_LABEL: Record<DriveType, string> = { fwd: "קדמית", rwd: "אחורית", awd: "AWD", four_wd: "4X4" };

export default function VehicleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: vehicle, isLoading } = useVehicleBySlug(slug);
  const { data: similar } = useSimilarVehicles(vehicle);
  const siteUrl = import.meta.env.VITE_SITE_URL ?? window.location.origin;

  useEffect(() => {
    if (vehicle) document.title = `${vehicle.brand} ${vehicle.model} ${vehicle.year} — Dealer DMS`;
  }, [vehicle]);

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-24 text-center text-[var(--color-steel-dark)]">טוען...</div>;
  }

  if (!vehicle) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">הרכב לא נמצא</h1>
        <p className="mt-2 text-[var(--color-steel-dark)]">ייתכן שהרכב נמכר או שהקישור אינו תקין.</p>
        <Link to="/inventory" className="mt-6 rounded-[var(--radius-card)] bg-[var(--color-navy)] px-5 py-2.5 text-sm text-white">
          חזרה למלאי
        </Link>
      </div>
    );
  }

  const isEv = vehicle.fuel_type === "electric" || vehicle.fuel_type === "plugin_hybrid";
  // Angle photos lead in a fixed order (front, rear, right, left,
  // interior); any extra uploads follow after them.
  const images = sortByAngle(vehicle.vehicle_images);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <Gallery
            images={images.map((i) => ({ url: i.url, caption: i.angle ? ANGLE_LABEL[i.angle] : undefined }))}
            alt={`${vehicle.brand} ${vehicle.model}`}
          />

          <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <VehicleStatusBadge status={vehicle.status} />
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
                {vehicle.brand} {vehicle.model} {vehicle.trim}
              </h1>
              <p className="text-[var(--color-steel-dark)]">{vehicle.year}</p>
            </div>
            <p className="font-[family-name:var(--font-mono)] text-3xl font-semibold text-[var(--color-navy)]">{formatPrice(vehicle.price)}</p>
          </div>

          <SpecStrip
            className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-steel)] bg-white py-4"
            specs={[
              { label: "קילומטראז׳", value: formatMileage(vehicle.mileage) },
              { label: "סוג דלק", value: FUEL_LABEL[vehicle.fuel_type] },
              { label: "תיבת הילוכים", value: TRANSMISSION_LABEL[vehicle.transmission] },
              { label: "הנעה", value: DRIVE_LABEL[vehicle.drive_type] },
              isEv
                ? { label: "טווח", value: vehicle.driving_range ? `${vehicle.driving_range} ק"מ` : "—" }
                : { label: "כוח סוס", value: vehicle.horsepower ? `${vehicle.horsepower} כ"ס` : "—" },
            ]}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <ShareButton title={`${vehicle.brand} ${vehicle.model}`} url={`${siteUrl}/vehicles/${vehicle.slug}`} />
            <FavoriteButton slug={vehicle.slug} />
            <CompareButton slug={vehicle.slug} />
          </div>

          {vehicle.description && (
            <section className="mt-8">
              <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl">תיאור הרכב</h2>
              <p className="whitespace-pre-line text-[var(--color-ink)]/90">{vehicle.description}</p>
            </section>
          )}

          {vehicle.features.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl">תוספות ואבזור</h2>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                {vehicle.features.map((f) => <li key={f}>• {f}</li>)}
              </ul>
            </section>
          )}

          {vehicle.safety_features.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl">מערכות בטיחות</h2>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                {vehicle.safety_features.map((f) => <li key={f}>• {f}</li>)}
              </ul>
            </section>
          )}

          {vehicle.warranty && (
            <section className="mt-8">
              <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl">אחריות</h2>
              <p className="text-sm">{vehicle.warranty}</p>
            </section>
          )}

          <section className="mt-8 rounded-[var(--radius-card)] border border-dashed border-[var(--color-steel)] p-5">
            <h2 className="font-[family-name:var(--font-display)] text-xl">מימון</h2>
            <p className="mt-1 text-sm text-[var(--color-steel-dark)]">ניתן לבחון מסלולי מימון מותאמים אישית מול הסוכנות. השאירו פרטים ונחזור עם הצעה.</p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-4 flex flex-col gap-2">
            <a href="tel:+972500000000" className="flex items-center justify-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-navy)] px-4 py-3 text-sm text-white">
              <Phone size={16} /> התקשרו עכשיו
            </a>
            <a
              href={`https://wa.me/972500000000?text=${encodeURIComponent(`שלום, מעוניין/ת ב${vehicle.brand} ${vehicle.model} (${vehicle.stock_number})`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-status-available)] px-4 py-3 text-sm text-white"
            >
              <MessageCircle size={16} /> וואטסאפ
            </a>
            <a href="#inquiry" className="flex items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-chrome-gold)] px-4 py-3 text-sm text-[var(--color-navy)]">
              <CalendarCheck size={16} /> קביעת נסיעת מבחן
            </a>
          </div>
          <div id="inquiry">
            <InquiryForm vehicleId={vehicle.id} defaultMessage="מעוניין/ת לתאם נסיעת מבחן" />
          </div>
        </aside>
      </div>

      {similar && similar.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl">רכבים דומים</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((v) => (
              <VehicleCard key={v.id} vehicle={v} coverImage={v.vehicle_images.find((i) => i.is_cover) ?? v.vehicle_images[0]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
