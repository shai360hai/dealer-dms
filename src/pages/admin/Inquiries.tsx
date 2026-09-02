import { useState } from "react";
import { Link } from "react-router";
import { Trash2, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui";
import { cn } from "../../components/ui/cn";
import {
  useInquiries,
  useUpdateInquiryStatus,
  useDeleteInquiries,
  useRestoreInquiries,
  useInquiryCounts,
} from "../../hooks/useInquiries";
import { timeAgo } from "../../lib/format";

type Tab = "all" | "new" | "contacted" | "closed" | "deleted";

const TAB_LABEL: Record<Tab, string> = {
  all: "הכל",
  new: "ממתין",
  contacted: "נוצר קשר",
  closed: "הושלם",
  deleted: "נמחקו",
};

const PAGE_SIZE = 20;

export default function Inquiries() {
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useInquiries({
    status: tab === "all" || tab === "deleted" ? undefined : tab,
    view: tab === "deleted" ? "deleted" : "active",
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: counts } = useInquiryCounts();

  const updateStatus = useUpdateInquiryStatus();
  const deleteInquiries = useDeleteInquiries();
  const restoreInquiries = useRestoreInquiries();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const error = deleteInquiries.error ?? restoreInquiries.error ?? updateStatus.error;

  function switchTab(t: Tab) {
    setTab(t);
    setPage(1);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allOnPageSelected = (data?.items.length ?? 0) > 0 && data!.items.every((i) => selected.has(i.id));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">פניות לקוחות</h1>
        {counts && (
          <p className="text-sm text-[var(--color-steel-dark)]">
            {counts.all} פניות · {counts.new} ממתינות · {counts.closed} הושלמו
          </p>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              tab === t ? "bg-[var(--color-navy)] text-white" : "bg-[var(--color-porcelain-dim)] hover:bg-[var(--color-steel)]",
            )}
          >
            {TAB_LABEL[t]}
            {counts && (
              <span className={cn("ms-1.5 text-xs", tab === t ? "text-white/70" : "text-[var(--color-steel-dark)]")}>
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-[var(--radius-card)] bg-[color-mix(in_srgb,var(--color-status-sold)_10%,white)] px-4 py-3 text-sm text-[var(--color-status-sold)]">
          {(error as Error).message}
        </p>
      )}

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] bg-[var(--color-porcelain-dim)] px-3 py-2 text-sm">
          <span>{selected.size} נבחרו</span>

          {tab === "deleted" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => restoreInquiries.mutate(Array.from(selected), { onSuccess: () => setSelected(new Set()) })}
            >
              <RotateCcw size={14} /> שחזור
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  Array.from(selected).forEach((id) => updateStatus.mutate({ id, status: "closed" }));
                  setSelected(new Set());
                }}
              >
                <CheckCircle2 size={14} /> סימון כהושלם
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (confirm(`למחוק ${selected.size} פניות? ניתן לשחזר אותן מלשונית ״נמחקו״.`)) {
                    deleteInquiries.mutate(Array.from(selected), { onSuccess: () => setSelected(new Set()) });
                  }
                }}
              >
                <Trash2 size={14} /> מחיקה
              </Button>
            </>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-steel)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-porcelain-dim)]">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(data?.items.map((i) => i.id)) : new Set())
                  }
                />
              </th>
              {["שם מלא", "טלפון", 'דוא"ל', "רכב", "הודעה", "סטטוס", "תאריך", ""].map((h, i) => (
                <th key={i} className="px-3 py-2 text-start font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-steel)]">
            {data?.items.map((inquiry) => (
              <tr key={inquiry.id} className={inquiry.deleted_at ? "opacity-60" : undefined}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(inquiry.id)} onChange={() => toggle(inquiry.id)} />
                </td>
                <td className="px-3 py-2">{inquiry.full_name}</td>
                <td className="px-3 py-2" dir="ltr"><a href={`tel:${inquiry.phone}`} className="underline">{inquiry.phone}</a></td>
                <td className="px-3 py-2" dir="ltr"><a href={`mailto:${inquiry.email}`} className="underline">{inquiry.email}</a></td>
                <td className="px-3 py-2">
                  {inquiry.vehicles ? (
                    <Link to={`/admin/vehicles/${inquiry.vehicles.id}/edit`} className="underline">
                      {inquiry.vehicles.brand} {inquiry.vehicles.model}
                    </Link>
                  ) : (
                    <span className="text-[var(--color-steel-dark)]">ללא רכב משויך</span>
                  )}
                </td>
                <td className="max-w-xs truncate px-3 py-2">{inquiry.message ?? "—"}</td>
                <td className="px-3 py-2">
                  <select
                    value={inquiry.status}
                    disabled={Boolean(inquiry.deleted_at)}
                    onChange={(e) => updateStatus.mutate({ id: inquiry.id, status: e.target.value })}
                    className="rounded border border-[var(--color-steel)] bg-transparent px-1.5 py-1 text-xs disabled:opacity-50"
                  >
                    <option value="new">ממתין</option>
                    <option value="contacted">נוצר קשר</option>
                    <option value="closed">הושלם</option>
                  </select>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--color-steel-dark)]">
                  {timeAgo(inquiry.created_at)}
                </td>
                <td className="px-3 py-2">
                  {inquiry.deleted_at ? (
                    <button
                      onClick={() => restoreInquiries.mutate([inquiry.id])}
                      title="שחזור"
                      className="text-[var(--color-steel-dark)] hover:text-[var(--color-navy)]"
                    >
                      <RotateCcw size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (confirm("למחוק את הפנייה? ניתן לשחזר אותה מלשונית ״נמחקו״.")) {
                          deleteInquiries.mutate([inquiry.id]);
                        }
                      }}
                      title="מחיקה"
                      className="text-[var(--color-steel-dark)] hover:text-[var(--color-status-sold)]"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && data?.items.length === 0 && (
          <p className="p-6 text-center text-sm text-[var(--color-steel-dark)]">
            {tab === "deleted" ? "אין פניות שנמחקו" : "אין פניות להצגה"}
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30">←</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-30">→</button>
        </div>
      )}
    </div>
  );
}
