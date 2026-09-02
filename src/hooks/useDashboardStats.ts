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
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const [total, available, reserved, sold, newInquiries, recentVehicles, recentActivity] = await Promise.all([
        supabase.from("vehicles").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "available").is("deleted_at", null),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "reserved").is("deleted_at", null),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "sold").is("deleted_at", null),
        supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new").is("deleted_at", null),
        supabase.from("vehicles").select("*, vehicle_images(*)").is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
        supabase.from("activity_logs").select("*, profiles(full_name, email)").order("created_at", { ascending: false }).limit(10),
      ]);

      return {
        total: total.count ?? 0,
        available: available.count ?? 0,
        reserved: reserved.count ?? 0,
        sold: sold.count ?? 0,
        newInquiries: newInquiries.count ?? 0,
        recentVehicles: (recentVehicles.data ?? []) as VehicleWithImages[],
        recentActivity: (recentActivity.data ?? []) as ActivityLogWithUser[],
      };
    },
  });
}
