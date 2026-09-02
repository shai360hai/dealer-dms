import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { logActivity } from "../lib/activity";
import { useAuth } from "./useAuth";
import type { Profile, UserRole } from "../types/database";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
  });
}

/** RLS blocks non-super_admins from changing roles, and a blocked write
 *  comes back as success with zero rows — so ask for the row back and
 *  treat an empty result as a permissions error rather than silence. */
export function useSetUserRole() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("אין לך הרשאה לשנות תפקידים. נדרשת הרשאת super_admin.");
      }
      await logActivity(user?.id, "USER_ROLE_CHANGED", "profile", id, { role });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update({ active })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("אין לך הרשאה לשנות סטטוס משתמשים. נדרשת הרשאת super_admin.");
      }
      await logActivity(user?.id, active ? "USER_ACTIVATED" : "USER_DEACTIVATED", "profile", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

/** Moves every active vehicle to the recycle bin. Nothing is destroyed —
 *  photos and inquiry links stay intact, and everything can be restored
 *  from the רכבים screen's "סל מחזור" tab. */
export function useDeleteAllVehicles() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { count: total } = await supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);

      if (!total) return { deleted: 0 };

      // Soft delete: everything moves to the recycle bin rather than
      // being destroyed, so a mis-click is recoverable.
      // .neq on a never-null column matches every row; PostgREST
      // requires some filter on a bulk write as a safety measure.
      const { data, error } = await supabase
        .from("vehicles")
        .update({ deleted_at: new Date().toISOString() })
        .is("deleted_at", null)
        .neq("id", "00000000-0000-0000-0000-000000000000")
        .select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("אין לך הרשאה למחוק רכבים. נדרשת הרשאת מנהל (admin או super_admin).");
      }

      await logActivity(user?.id, "VEHICLES_ALL_DELETED", "vehicle", undefined, {
        deleted: data.length,
      });
      return { deleted: data.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Permanently destroys everything in the recycle bin. This is the only
 *  action in the app that actually deletes vehicle data — images cascade
 *  with it, and inquiries survive with their vehicle link cleared. */
export function useEmptyRecycleBin() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .delete()
        .not("deleted_at", "is", null)
        .select("id");
      if (error) throw error;
      await logActivity(user?.id, "RECYCLE_BIN_EMPTIED", "vehicle", undefined, {
        purged: data?.length ?? 0,
      });
      return { purged: data?.length ?? 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
