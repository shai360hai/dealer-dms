import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { VehicleCard, Input, Button } from "../../components/ui";
import { useVehicles, fetchPublishedBrands } from "../../hooks/useVehicles";
import { pickCoverImage } from "../../lib/angles";

const FUEL_LABEL: Record<string, string> = { petrol: "בנזין", diesel: "דיזל", hybrid: "היברידי", plugin_hybrid: "נטען (Plug-in)", electric: "חשמלי" };
const TRANSMISSION_LABEL: Record<string, string> = { manual: "ידני", automatic: "אוטומטי", cvt: "CVT", dct: "DCT" };

export default function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [brands, setBrands] = useState<string[]>([]);
  const page = Number(searchParams.get("page") ?? 1);

  useEffect(() => {
    fetchPublishedBrands().then(setBrands);
  }, []);

  const { data, isLoading } = useVehicles({
    publishedOnly: true,
    q: searchParams.get("q") ?? undefined,
    brand: searchParams.get("brand") ?? undefined,
    fuelType: searchParams.get("fuelType") ?? undefined,
    transmission: searchParams.get("transmission") ?? undefined,
    priceMin: searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : undefined,
    priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : undefined,
    mileageMax: searchParams.get("mileageMax") ? Number(searchParams.get("mileageMax")) : undefined,
    page,
    pageSize: 12,
  });

  /** Changing any filter resets to page 1 — otherwise you can end up on
   *  page 4 of a result set that now only has one page. */
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  }

  /** Paging must NOT go through setParam — that deletes the page param
   *  by design, which would make every page button a no-op. */
  function goToPage(p: number) {
    const next = new URLSearchParams(searchParams);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const selectClass = "h-10 rounded-[var(--radius-card)] border border-[var(--color-steel)] bg-white px-3 text-sm";
  const totalPages = data ? Math.max(1, Math.ceil(data.total / 12)) : 1;
  // "X רכבים במלאי" is only accurate with no filters applied; once the
  // list is narrowed the number describes the search, not the stock.
  const hasFilters = Array.from(searchParams.keys()).some((k) => k !== "page");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-2xl">מלאי הרכבים</h1>
      <p className="mb-6 text-sm text-[var(--color-steel-dark)]">
        {!data
          ? "טוען..."
          : hasFilters
            ? `${data.total} רכבים תואמים את החיפוש`
            : `${data.total} רכבים במלאי`}
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-steel)] bg-white p-4">
          <p className="text-sm font-medium">סינון</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
            <select className={selectClass} value={searchParams.get("brand") ?? ""} onChange={(e) => setParam("brand", e.target.value)}>
              <option value="">כל היצרנים</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select className={selectClass} value={searchParams.get("fuelType") ?? ""} onChange={(e) => setParam("fuelType", e.target.value)}>
              <option value="">כל סוגי הדלק</option>
              {Object.entries(FUEL_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select className={selectClass} value={searchParams.get("transmission") ?? ""} onChange={(e) => setParam("transmission", e.target.value)}>
              <option value="">כל התיבות</option>
              {Object.entries(TRANSMISSION_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <Input type="number" placeholder="מחיר מינימום" defaultValue={searchParams.get("priceMin") ?? ""} onBlur={(e) => setParam("priceMin", e.target.value)} />
            <Input type="number" placeholder="מחיר מקסימום" defaultValue={searchParams.get("priceMax") ?? ""} onBlur={(e) => setParam("priceMax", e.target.value)} />
            <Input type="number" placeholder="קילומטראז׳ מקסימלי" defaultValue={searchParams.get("mileageMax") ?? ""} onBlur={(e) => setParam("mileageMax", e.target.value)} />
          </div>
          {searchParams.toString() && (
            <Button variant="outline" size="sm" className="self-start" onClick={() => setSearchParams({})}>
              איפוס סינון
            </Button>
          )}
        </div>

        <div>
          {!isLoading && data?.items.length === 0 ? (
            <p className="rounded-[var(--radius-card)] border border-[var(--color-steel)] p-10 text-center text-sm text-[var(--color-steel-dark)]">
              לא נמצאו רכבים התואמים את הסינון שבחרתם
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data?.items.map((v) => (
                <VehicleCard key={v.id} vehicle={v} coverImage={pickCoverImage(v.vehicle_images)} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`rounded-[var(--radius-card)] px-3 py-1.5 text-sm ${p === page ? "bg-[var(--color-navy)] text-white" : "border border-[var(--color-steel)]"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
