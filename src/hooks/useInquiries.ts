import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { logActivity } from "../lib/activity";
import { useAuth } from "./useAuth";
import type { InquiryFormInput } from "../lib/schemas";
import type { Inquiry, Vehicle, InquiryStatus } from "../types/database";

export type InquiryWithVehicle = Inquiry & { vehicles: Pick<Vehicle, "id" | "brand" | "model" | "slug" | "stock_number"> | null };

export function useInquiries(params: {
  status?: string;
  /** "active" (default) hides deleted; "deleted" shows only them. */
  view?: "active" | "deleted";
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: ["inquiries", params],
    queryFn: async () => {
      const from = (params.page - 1) * params.pageSize;
      let query = supabase
        .from("inquiries")
        .select("*, vehicles(id, brand, model, slug, stock_number)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, from + params.pageSize - 1);
      if (params.view === "deleted") query = query.not("deleted_at", "is", null);
      else query = query.is("deleted_at", null);

      if (params.status) query = query.eq("status", params.status as InquiryStatus);
      const { data, error, count } = await query;
      if (error) throw error;
      return { items: (data ?? []) as InquiryWithVehicle[], total: count ?? 0 };
    },
  });
}

export function useSubmitInquiry() {
  return useMutation({
    mutationFn: async (input: InquiryFormInput) => {
      const { error } = await supabase.from("inquiries").insert({ ...input, message: input.message || null, vehicle_id: input.vehicle_id || null });
      if (error) throw error;
    },
  });
}

export function useUpdateInquiryStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("inquiries").update({ status: status as InquiryStatus }).eq("id", id);
      if (error) throw error;
      await logActivity(user?.id, "INQUIRY_STATUS_CHANGED", "inquiry", id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Soft-deletes inquiries so they can be reviewed or restored later. */
export function useDeleteInquiries() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase
        .from("inquiries")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("אין לך הרשאה למחוק פניות.");
      }
      await logActivity(user?.id, "INQUIRIES_DELETED", "inquiry", undefined, { count: data.length });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRestoreInquiries() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase
        .from("inquiries")
        .update({ deleted_at: null })
        .in("id", ids)
        .select("id");
      if (error) throw error;
      await logActivity(user?.id, "INQUIRIES_RESTORED", "inquiry", undefined, { count: data?.length ?? 0 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Counts per status for the filter tabs. */
export function useInquiryCounts() {
  return useQuery({
    queryKey: ["inquiries", "counts"],
    queryFn: async () => {
      const active = supabase.from("inquiries").select("id", { count: "exact", head: true }).is("deleted_at", null);
      const [all, isNew, contacted, closed, deleted] = await Promise.all([
        active,
        supabase.from("inquiries").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "new"),
        supabase.from("inquiries").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "contacted"),
        supabase.from("inquiries").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "closed"),
        supabase.from("inquiries").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
      ]);
      return {
        all: all.count ?? 0,
        new: isNew.count ?? 0,
        contacted: contacted.count ?? 0,
        closed: closed.count ?? 0,
        deleted: deleted.count ?? 0,
      };
    },
  });
}
