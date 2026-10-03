import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { HeartOff } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { VehicleCard } from "../../components/ui";
import { pickCoverImage } from "../../lib/angles";
import { usePageMeta } from "../../hooks/usePageMeta";
import type { VehicleWithImages } from "../../types/database";

const STORAGE_KEY = "dealer-dms-favorites";

function readFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function Favorites() {
  const [slugs, setSlugs] = useState<string[]>([]);

  usePageMeta({ title: "הרכבים שאהבתי — Dealer DMS" });

  useEffect(() => {
    setSlugs(readFavorites());
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["favorites", slugs],
    queryFn: async () => {
      if (slugs.length === 0) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("*, vehicle_images(*)")
        .in("slug", slugs)
        .eq("published", true)
        .eq("status", "available")
        .is("deleted_at", null);
      if (error) throw error;
      return (data ?? []) as VehicleWithImages[];
    },
    enabled: slugs.length > 0,
  });

  // A saved car may since have been sold or unpublished, so the fetched
  // list can be shorter than the saved list — that's expected, not an error.
  const missing = slugs.length - (data?.length ?? 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-2xl">הרכבים שאהבתי</h1>

      {slugs.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <HeartOff size={32} className="text-[var(--color-steel)]" />
          <p className="text-[var(--color-steel-dark)]">עדיין לא שמרתם רכבים.</p>
          <p className="max-w-sm text-sm text-[var(--color-steel-dark)]">
            בעמוד של כל רכב יש כפתור ״הוספה למועדפים״ — הרכבים שתסמנו יופיעו כאן,
            שמורים בדפדפן הזה.
          </p>
          <Link to="/inventory" className="mt-2 rounded-[var(--radius-card)] bg-[var(--color-navy)] px-5 py-2.5 text-sm text-white">
            למלאי הרכבים
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-[var(--color-steel-dark)]">
            {isLoading ? "טוען…" : `${data?.length ?? 0} רכבים שמורים`}
            {missing > 0 && !isLoading && ` · ${missing} רכבים שסימנתם כבר אינם זמינים`}
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data?.map((v) => (
              <VehicleCard key={v.id} vehicle={v} coverImage={pickCoverImage(v.vehicle_images)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
