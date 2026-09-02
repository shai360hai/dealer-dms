import { useState, useDeferredValue } from "react";
import { Link } from "react-router";
import { Plus, Copy, Trash2, Eye, EyeOff, Upload, RotateCcw } from "lucide-react";
import { Button, Input } from "../../components/ui";
import { CsvImportDialog } from "../../components/CsvImportDialog";
import { formatPrice, formatMileage } from "../../lib/format";
import {
  useVehicles,
  useDeleteVehicle,
  useBulkDeleteVehicles,
  useSetVehicleStatus,
  useSetPublished,
  useDuplicateVehicle,
  useRestoreVehicles,
  useVehicleCounts,
} from "../../hooks/useVehicles";
import type { VehicleFilters } from "../../hooks/useVehicles";
import { pickCoverImage } from "../../lib/angles";

const STATUS_LABEL: Record<string, string> = { available: "זמין", reserved: "שמור", sold: "נמכר" };

export default function VehiclesList() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<NonNullable<VehicleFilters["sort"]>>("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [view, setView] = useState<"active" | "deleted">("active");

  const { data, isLoading, isFetching } = useVehicles({
    q: deferredSearch || undefined,
    status: status || undefined,
    sort,
    view,
    page,
    pageSize: 20,
  });
  const { data: counts } = useVehicleCounts();
  const restoreVehicles = useRestoreVehicles();
  const deleteVehicle = useDeleteVehicle();
  const bulkDelete = useBulkDeleteVehicles();
  const setVehicleStatus = useSetVehicleStatus();
  const setPublished = useSetPublished();
  const duplicateVehicle = useDuplicateVehicle();

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 20)) : 1;

  return (
    <div>
      {showImport && <CsvImportDialog onClose={() => setShowImport(false)} />}

      {(deleteVehicle.isError || bulkDelete.isError || restoreVehicles.isError) && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-[var(--radius-card)] bg-[color-mix(in_srgb,var(--color-status-sold)_10%,white)] px-4 py-3 text-sm text-[var(--color-status-sold)]">
          <span>
            {(deleteVehicle.error ?? bulkDelete.error ?? restoreVehicles.error) instanceof Error
              ? (deleteVehicle.error ?? bulkDelete.error ?? restoreVehicles.error)?.message
              : "הפעולה נכשלה"}
          </span>
          <button
            onClick={() => {
              deleteVehicle.reset();
              bulkDelete.reset();
              restoreVehicles.reset();
            }}
            aria-label="סגירה"
          >
            ✕
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl">רכבים</h1>
          {counts && (
            <p className="mt-0.5 text-sm text-[var(--color-steel-dark)]">
              {counts.active} רכבים במלאי · {counts.published} מפורסמים באתר
              {counts.deleted > 0 && ` · ${counts.deleted} בסל המחזור`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload size={16} /> ייבוא מ-CSV
          </Button>
          <Link to="/admin/vehicles/new">
            <Button variant="gold">
              <Plus size={16} /> הוספת רכב
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {(["active", "deleted"] as const).map((v) => (
          <button
            key={v}
            onClick={() => {
              setView(v);
              setPage(1);
              setSelected(new Set());
            }}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              view === v ? "bg-[var(--color-navy)] text-white" : "bg-[var(--color-porcelain-dim)] hover:bg-[var(--color-steel)]"
            }`}
          >
            {v === "active" ? "מלאי פעיל" : "סל מחזור"}
            {counts && (
              <span className={`ms-1.5 text-xs ${view === v ? "text-white/70" : "text-[var(--color-steel-dark)]"}`}>
                {v === "active" ? counts.active : counts.deleted}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="חיפוש לפי יצרן, דגם או מספר מלאי"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-[var(--radius-card)] border border-[var(--color-steel)] bg-white px-3 text-sm"
        >
          <option value="">כל הסטטוסים</option>
          <option value="available">זמין</option>
          <option value="reserved">שמור</option>
          <option value="sold">נמכר</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-[var(--radius-card)] border border-[var(--color-steel)] bg-white px-3 text-sm">
          <option value="newest">החדש ביותר</option>
          <option value="oldest">הישן ביותר</option>
          <option value="price_asc">מחיר: מהנמוך לגבוה</option>
          <option value="price_desc">מחיר: מהגבוה לנמוך</option>
          <option value="mileage_asc">קילומטראז׳: מהנמוך לגבוה</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-[var(--radius-card)] bg-[var(--color-porcelain-dim)] px-3 py-2 text-sm">
          <span>{selected.size} נבחרו</span>
          {view === "deleted" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => restoreVehicles.mutate(Array.from(selected), { onSuccess: () => setSelected(new Set()) })}
            >
              <RotateCcw size={14} /> שחזור נבחרים
            </Button>
          ) : (
            <button
              onClick={() => {
                if (confirm("להעביר את הרכבים הנבחרים לסל המחזור? ניתן לשחזר אותם משם.")) {
                  bulkDelete.mutate(Array.from(selected), { onSuccess: () => setSelected(new Set()) });
                }
              }}
              className="text-[var(--color-status-sold)] underline"
            >
              מחיקת נבחרים
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-steel)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-porcelain-dim)]">
            <tr>
              <th className="w-10 px-3 py-2" />
              <th className="px-3 py-2 text-start font-medium">תמונה</th>
              <th className="px-3 py-2 text-start font-medium">רכב</th>
              <th className="px-3 py-2 text-start font-medium">שנה</th>
              <th className="px-3 py-2 text-start font-medium">מחיר</th>
              <th className="px-3 py-2 text-start font-medium">ק"מ</th>
              <th className="px-3 py-2 text-start font-medium">סטטוס</th>
              <th className="px-3 py-2 text-start font-medium">פורסם</th>
              <th className="px-3 py-2 text-start font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-steel)]">
            {data?.items.map((v) => {
              const cover = pickCoverImage(v.vehicle_images);
              return (
                <tr key={v.id} className={isFetching ? "opacity-60" : undefined}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggleSelect(v.id)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-10 w-14 overflow-hidden rounded bg-[var(--color-porcelain-dim)]">
                      {cover ? <img src={cover.url} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{v.brand} {v.model} {v.trim ?? ""}</p>
                    <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-steel-dark)]">{v.stock_number}</p>
                  </td>
                  <td className="px-3 py-2">{v.year}</td>
                  <td className="px-3 py-2 font-[family-name:var(--font-mono)]">{formatPrice(v.price)}</td>
                  <td className="px-3 py-2">{formatMileage(v.mileage)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={v.status}
                      onChange={(e) => setVehicleStatus.mutate({ id: v.id, status: e.target.value })}
                      className="rounded border border-[var(--color-steel)] bg-transparent px-1.5 py-1 text-xs"
                    >
                      {Object.entries(STATUS_LABEL).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => setPublished.mutate({ id: v.id, published: !v.published })} title={v.published ? "הסרת פרסום" : "פרסום"}>
                      {v.published ? <Eye size={16} className="text-[var(--color-navy)]" /> : <EyeOff size={16} className="text-[var(--color-steel-dark)]" />}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/vehicles/${v.id}/edit`} className="text-xs text-[var(--color-navy)] underline">עריכה</Link>
                      <button onClick={() => duplicateVehicle.mutate(v.id)} title="שכפול">
                        <Copy size={15} className="text-[var(--color-steel-dark)] hover:text-[var(--color-navy)]" />
                      </button>
                      {v.deleted_at ? (
                        <button onClick={() => restoreVehicles.mutate([v.id])} title="שחזור">
                          <RotateCcw size={15} className="text-[var(--color-steel-dark)] hover:text-[var(--color-navy)]" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm("להעביר את הרכב לסל המחזור? ניתן לשחזר אותו משם.")) deleteVehicle.mutate(v.id);
                          }}
                          title="מחיקה"
                        >
                          <Trash2 size={15} className="text-[var(--color-steel-dark)] hover:text-[var(--color-status-sold)]" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!isLoading && data?.items.length === 0 && <p className="p-6 text-center text-sm text-[var(--color-steel-dark)]">לא נמצאו רכבים</p>}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30">←</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-30">→</button>
        </div>
      )}
    </div>
  );
}
