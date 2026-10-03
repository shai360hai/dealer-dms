import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { VehicleWithImages } from "../types/database";
import type { ActivityLogWithUser } from "./useActivityLogs";

export interface DashboardStats {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  newInquiries: number;
  recentVehicles: VehicleWithImages[];
  recentActivity: ActivityLogWithUser[];
  mostViewed: VehicleWithImages[];
  totalValue: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const [total, available, reserved, sold, newInquiries, recentVehicles, recentActivity, mostViewed, prices] = await Promise.all([
        supabase.from("vehicles").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "available").is("deleted_at", null),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "reserved").is("deleted_at", null),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "sold").is("deleted_at", null),
        supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new").is("deleted_at", null),
        supabase.from("vehicles").select("*, vehicle_images(*)").is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
        supabase.from("activity_logs").select("*, profiles(full_name, email)").order("created_at", { ascending: false }).limit(10),
        supabase
          .from("vehicles")
          .select("*, vehicle_images(*)")
          .is("deleted_at", null)
          .gt("view_count", 0)
          .order("view_count", { ascending: false })
          .limit(5),
        // Total value of active stock — a number the dealer otherwise
        // has to work out by hand.
        supabase.from("vehicles").select("price").is("deleted_at", null).neq("status", "sold"),
      ]);

      return {
        total: total.count ?? 0,
        available: available.count ?? 0,
        reserved: reserved.count ?? 0,
        sold: sold.count ?? 0,
        newInquiries: newInquiries.count ?? 0,
        recentVehicles: (recentVehicles.data ?? []) as VehicleWithImages[],
        recentActivity: (recentActivity.data ?? []) as ActivityLogWithUser[],
        mostViewed: (mostViewed.data ?? []) as VehicleWithImages[],
        totalValue: (prices.data ?? []).reduce((sum, v) => sum + Number(v.price), 0),
      };
    },
  });
}
