import { Link } from "react-router";
import { Car, CheckCircle2, Clock, Ban, MessageSquareText, Eye, Wallet } from "lucide-react";
import { StatCard, VehicleStatusBadge, Card } from "../../components/ui";
import { formatPrice } from "../../lib/format";
import { useDashboardStats } from "../../hooks/useDashboardStats";
import { timeAgo } from "../../lib/format";
import { pickCoverImage } from "../../lib/angles";
import { sizedImageUrl, IMAGE_SIZES } from "../../lib/image-size";

const ACTION_LABEL: Record<string, string> = {
  VEHICLE_CREATED: "נוצר רכב חדש",
  VEHICLE_UPDATED: "עודכן רכב",
  VEHICLE_DELETED: "נמחק רכב",
  VEHICLE_DUPLICATED: "שוכפל רכב",
  VEHICLE_STATUS_CHANGED: "עודכן סטטוס רכב",
  VEHICLE_PUBLISHED: "רכב פורסם באתר",
  VEHICLE_UNPUBLISHED: "הוסר פרסום רכב",
  INQUIRY_STATUS_CHANGED: "עודכן סטטוס פנייה",
  VEHICLES_BULK_DELETED: "מחיקה מרוכזת של רכבים",
};

export default function Dashboard() {
  const { data, isLoading } = useDashboardStats();

  return (
    <div>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl">לוח בקרה</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="סה״כ רכבים" value={isLoading ? "—" : (data?.total ?? 0)} icon={Car} />
        <StatCard label="זמינים" value={isLoading ? "—" : (data?.available ?? 0)} icon={CheckCircle2} />
        <StatCard label="שמורים" value={isLoading ? "—" : (data?.reserved ?? 0)} icon={Clock} />
        <StatCard label="נמכרו" value={isLoading ? "—" : (data?.sold ?? 0)} icon={Ban} />
        <StatCard label="פניות חדשות" value={isLoading ? "—" : (data?.newInquiries ?? 0)} icon={MessageSquareText} accent />
      </div>

      <div className="mt-4">
        <StatCard
          label="שווי המלאי (ללא רכבים שנמכרו)"
          value={isLoading ? "—" : formatPrice(data?.totalValue ?? 0)}
          icon={Wallet}
        />
      </div>

      {(data?.mostViewed.length ?? 0) > 0 && (
        <Card className="mt-6 p-4">
          <h2 className="mb-1 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
            <Eye size={18} className="text-[var(--color-chrome-gold)]" /> הרכבים הנצפים ביותר
          </h2>
          <p className="mb-3 text-xs text-[var(--color-steel-dark)]">
            מבוסס על כניסות לעמוד הרכב באתר הציבורי — שימושי כדי לזהות מה מושך עניין ומה תקוע.
          </p>
          <ul className="flex flex-col divide-y divide-[var(--color-steel)]">
            {data?.mostViewed.map((v, i) => {
              const cover = v.vehicle_images.find((img) => img.is_cover) ?? v.vehicle_images[0];
              return (
                <li key={v.id}>
                  <Link to={`/admin/vehicles/${v.id}/edit`} className="flex items-center gap-3 py-2.5">
                    <span className="w-5 text-center font-[family-name:var(--font-mono)] text-sm text-[var(--color-steel-dark)]">
                      {i + 1}
                    </span>
                    <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-[var(--color-porcelain-dim)]">
                      {cover ? (
                        <img src={sizedImageUrl(cover.url, IMAGE_SIZES.thumb)} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{v.brand} {v.model} · {v.year}</p>
                      <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-steel-dark)]">{formatPrice(v.price)}</p>
                    </div>
                    <span className="flex items-center gap-1 text-sm text-[var(--color-steel-dark)]">
                      <Eye size={13} /> {v.view_count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">רכבים שנוספו לאחרונה</h2>
          <ul className="flex flex-col divide-y divide-[var(--color-steel)]">
            {data?.recentVehicles.map((v) => {
              const cover = pickCoverImage(v.vehicle_images);
              return (
                <li key={v.id}>
                  <Link to={`/admin/vehicles/${v.id}/edit`} className="flex items-center gap-3 py-2.5">
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-porcelain-dim)]">
                      {cover ? <img src={sizedImageUrl(cover.url, IMAGE_SIZES.thumb)} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{v.brand} {v.model} · {v.year}</p>
                      <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-steel-dark)]">{formatPrice(v.price)}</p>
                    </div>
                    <VehicleStatusBadge status={v.status} />
                  </Link>
                </li>
              );
            })}
            {!isLoading && data?.recentVehicles.length === 0 && <p className="py-4 text-sm text-[var(--color-steel-dark)]">—</p>}
          </ul>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">פעילות אחרונה</h2>
          <ul className="flex flex-col divide-y divide-[var(--color-steel)]">
            {data?.recentActivity.map((log) => (
              <li key={log.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p>{ACTION_LABEL[log.action] ?? log.action}</p>
                  <p className="text-xs text-[var(--color-steel-dark)]">{log.profiles?.full_name ?? "—"}</p>
                </div>
                <span className="text-xs text-[var(--color-steel-dark)]">{timeAgo(log.created_at)}</span>
              </li>
            ))}
            {!isLoading && data?.recentActivity.length === 0 && <p className="py-4 text-sm text-[var(--color-steel-dark)]">אין פעילות להצגה</p>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
