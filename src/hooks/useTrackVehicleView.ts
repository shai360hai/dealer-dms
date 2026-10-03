import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const SESSION_KEY = "dealer-dms-viewed";

/**
 * Records that a visitor opened a vehicle page.
 *
 * Counted once per browser session per car — otherwise a refresh or a
 * back-and-forth between two cars would inflate the number and make the
 * "most viewed" list meaningless. Failures are swallowed on purpose:
 * analytics must never break the page a customer is trying to read.
 */
export function useTrackVehicleView(slug: string | undefined, ready: boolean) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!slug || !ready || tracked.current) return;
    tracked.current = true;

    let seen: string[] = [];
    try {
      seen = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]");
    } catch {
      seen = [];
    }
    if (seen.includes(slug)) return;

    supabase
      .rpc("increment_vehicle_view", { vehicle_slug: slug })
      .then(() => {
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify([...seen, slug]));
        } catch {
          // Private browsing can block sessionStorage; the view was
          // still counted, it just may count again next navigation.
        }
      });
  }, [slug, ready]);
}
