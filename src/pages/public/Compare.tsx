import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { X, GitCompare } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { formatPrice, formatMileage } from "../../lib/format";
import { sizedImageUrl, IMAGE_SIZES } from "../../lib/image-size";
import { pickCoverImage } from "../../lib/angles";
import { usePageMeta } from "../../hooks/usePageMeta";
import type { VehicleWithImages } from "../../types/database";

const FUEL_LABEL: Record<string, string> = {
  petrol: "בנזין",
  diesel: "דיזל",
  hybrid: "היברידי",
  plugin_hybrid: "נטען (Plug-in)",
  electric: "חשמלי",
};
const TRANSMISSION_LABEL: Record<string, string> = { manual: "ידני", automatic: "אוטומטי", cvt: "CVT", dct: "DCT" };
const DRIVE_LABEL: Record<string, string> = { fwd: "קדמית", rwd: "אחורית", awd: "AWD", four_wd: "4X4" };

interface Row {
  label: string;
  value: (v: VehicleWithImages) => string;
}

const ROWS: Row[] = [
  { label: "מחיר", value: (v) => formatPrice(v.price) },
  { label: "שנה", value: (v) => String(v.year) },
  { label: "קילומטראז׳", value: (v) => formatMileage(v.mileage) },
  { label: "סוג דלק", value: (v) => FUEL_LABEL[v.fuel_type] ?? v.fuel_type },
  { label: "תיבת הילוכים", value: (v) => TRANSMISSION_LABEL[v.transmission] ?? v.transmission },
  { label: "הנעה", value: (v) => DRIVE_LABEL[v.drive_type] ?? v.drive_type },
  { label: "כוח סוס", value: (v) => (v.horsepower ? `${v.horsepower} כ״ס` : "—") },
  { label: "מנוע", value: (v) => v.engine || "—" },
  { label: "קיבולת סוללה", value: (v) => v.battery_capacity || "—" },
  { label: "טווח נסיעה", value: (v) => (v.driving_range ? `${v.driving_range} ק״מ` : "—") },
  { label: "מספר בעלים", value: (v) => String(v.owners) },
  { label: "צבע חיצוני", value: (v) => v.exterior_color },
  { label: "צבע פנים", value: (v) => v.interior_color },
  { label: "אחריות", value: (v) => v.warranty || "—" },
  { label: "מספר תוספות", value: (v) => String(v.features.length) },
  { label: "מערכות בטיחות", value: (v) => String(v.safety_features.length) },
];

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const slugs = (searchParams.get("cars") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  usePageMeta({ title: "השוואת רכבים — Dealer DMS" });

  const { data, isLoading } = useQuery({
    queryKey: ["compare", slugs],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*, vehicle_images(*)")
        .in("slug", slugs)
        .eq("published", true)
        .eq("status", "available")
        .is("deleted_at", null);
      if (error) throw error;
      // Preserve the order the user picked them in, which the database
      // doesn't guarantee.
      return slugs
        .map((s) => (data as VehicleWithImages[]).find((v) => v.slug === s))
        .filter((v): v is VehicleWithImages => Boolean(v));
    },
    enabled: slugs.length > 0,
  });

  function remove(slug: string) {
    const next = slugs.filter((s) => s !== slug);
    if (next.length === 0) setSearchParams({});
    else setSearchParams({ cars: next.join(",") });
  }

  if (slugs.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <GitCompare size={32} className="text-[var(--color-steel)]" />
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl">השוואת רכבים</h1>
        <p className="mt-2 text-sm text-[var(--color-steel-dark)]">
          בעמוד של כל רכב יש כפתור ״הוספה להשוואה״. אפשר להשוות עד שלושה רכבים זה מול זה.
        </p>
        <Link to="/inventory" className="mt-6 rounded-[var(--radius-card)] bg-[var(--color-navy)] px-5 py-2.5 text-sm text-white">
          למלאי הרכבים
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl">השוואת רכבים</h1>

      {isLoading ? (
        <p className="text-sm text-[var(--color-steel-dark)]">טוען…</p>
      ) : !data || data.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--color-steel)] p-10 text-center text-sm text-[var(--color-steel-dark)]">
          הרכבים שבחרתם כבר אינם זמינים.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-32 p-2" />
                {data.map((v) => {
                  const cover = pickCoverImage(v.vehicle_images);
                  return (
                    <th key={v.id} className="p-2 align-top">
                      <div className="relative rounded-[var(--radius-card)] border border-[var(--color-steel)] bg-white p-3">
                        <button
                          onClick={() => remove(v.slug)}
                          aria-label="הסרה מההשוואה"
                          className="absolute end-2 top-2 text-[var(--color-steel-dark)] hover:text-[var(--color-status-sold)]"
                        >
                          <X size={15} />
                        </button>
                        <div className="mb-2 aspect-[4/3] overflow-hidden rounded bg-[var(--color-porcelain-dim)]">
                          {cover && (
                            <img
                              src={sizedImageUrl(cover.url, IMAGE_SIZES.card)}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <Link to={`/vehicles/${v.slug}`} className="block text-start font-medium hover:underline">
                          {v.brand} {v.model}
                        </Link>
                        <p className="text-start text-xs font-normal text-[var(--color-steel-dark)]">{v.trim ?? ""}</p>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const values = data.map((v) => row.value(v));
                // Highlighting only the rows that actually differ is the
                // whole point of a comparison — identical rows are noise.
                const differs = new Set(values).size > 1 && data.length > 1;
                return (
                  <tr key={row.label} className={differs ? "bg-[color-mix(in_srgb,var(--color-chrome-gold)_8%,white)]" : undefined}>
                    <th className="border-t border-[var(--color-steel)] p-2 text-start text-xs font-medium text-[var(--color-steel-dark)]">
                      {row.label}
                    </th>
                    {values.map((val, i) => (
                      <td key={i} className="border-t border-[var(--color-steel)] p-2 text-start">
                        {val}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-[var(--color-steel-dark)]">
            שורות מודגשות הן המאפיינים שבהם הרכבים נבדלים זה מזה.
          </p>
        </div>
      )}
    </div>
  );
}
