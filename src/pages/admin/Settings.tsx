import { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { useUsers, useSetUserRole, useSetUserActive, useDeleteAllVehicles, useEmptyRecycleBin } from "../../hooks/useUsers";
import { useVehicleCounts } from "../../hooks/useVehicles";
import type { UserRole } from "../../types/database";

const ROLE_LABEL: Record<UserRole, string> = {
  editor: "רכז מלאי (עריכה בלבד)",
  admin: "מנהל (כולל מחיקה)",
  super_admin: "מנהל מערכת (הרשאות מלאות)",
};

const CONFIRM_WORD = "מחק הכל";

export default function Settings() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === "super_admin";
  const isManager = profile?.role === "super_admin" || profile?.role === "admin";

  const { data: users, isLoading } = useUsers();
  const setRole = useSetUserRole();
  const setActive = useSetUserActive();
  const deleteAll = useDeleteAllVehicles();
  const emptyBin = useEmptyRecycleBin();
  const { data: counts } = useVehicleCounts();

  const [confirmText, setConfirmText] = useState("");
  const [purgeText, setPurgeText] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-[family-name:var(--font-display)] text-2xl">הגדרות</h1>

      <Card>
        <CardHeader>
          <CardTitle>משתמשי מערכת</CardTitle>
          <p className="text-sm text-[var(--color-steel-dark)]">
            שינוי תפקידים והפעלה/השבתה של חשבונות. יצירת משתמש חדש נעשית מלוח הבקרה של
            Supabase (Authentication ← Users), ומשם החשבון יופיע כאן אוטומטית עם תפקיד
            ״רכז מלאי״.
          </p>
        </CardHeader>
        <CardContent>
          {!isSuperAdmin && (
            <p className="mb-3 rounded-[var(--radius-card)] bg-[var(--color-porcelain-dim)] px-3 py-2 text-xs text-[var(--color-steel-dark)]">
              רק מנהל מערכת (super_admin) יכול לשנות תפקידים. התפקיד שלך: {profile ? ROLE_LABEL[profile.role] : "—"}
            </p>
          )}

          {(setRole.isError || setActive.isError) && (
            <p className="mb-3 rounded-[var(--radius-card)] bg-[color-mix(in_srgb,var(--color-status-sold)_10%,white)] px-3 py-2 text-sm text-[var(--color-status-sold)]">
              {((setRole.error ?? setActive.error) as Error)?.message}
            </p>
          )}

          {isLoading && <p className="text-sm text-[var(--color-steel-dark)]">טוען…</p>}

          <ul className="flex flex-col divide-y divide-[var(--color-steel)]">
            {users?.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {u.full_name ?? u.email}
                    {u.id === profile?.id && (
                      <span className="rounded-full bg-[var(--color-porcelain-dim)] px-2 py-0.5 text-[10px]">אתה</span>
                    )}
                    {u.role === "super_admin" && <ShieldCheck size={13} className="text-[var(--color-chrome-gold)]" />}
                  </p>
                  <p className="truncate text-xs text-[var(--color-steel-dark)]" dir="ltr">{u.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={u.role}
                    disabled={!isSuperAdmin || setRole.isPending}
                    onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value as UserRole })}
                    className="h-9 rounded-[var(--radius-card)] border border-[var(--color-steel)] bg-white px-2 text-xs disabled:opacity-50"
                  >
                    {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!isSuperAdmin || u.id === profile?.id || setActive.isPending}
                    onClick={() => setActive.mutate({ id: u.id, active: !u.active })}
                    title={u.id === profile?.id ? "אי אפשר להשבית את החשבון שלך" : undefined}
                  >
                    {u.active ? "השבתה" : "הפעלה"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-[var(--color-status-sold)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--color-status-sold)]">
            <AlertTriangle size={18} /> אזור מסוכן
          </CardTitle>
          <p className="text-sm text-[var(--color-steel-dark)]">
            העברת כל הרכבים לסל המחזור. הרכבים ייעלמו מהאתר הציבורי אך יישמרו וניתן
            לשחזר אותם בכל רגע מלשונית ״סל מחזור״ במסך הרכבים.
          </p>
        </CardHeader>
        <CardContent>
          {!isManager ? (
            <p className="rounded-[var(--radius-card)] bg-[var(--color-porcelain-dim)] px-3 py-2 text-xs text-[var(--color-steel-dark)]">
              נדרשת הרשאת מנהל (admin או super_admin) כדי למחוק רכבים.
            </p>
          ) : deleteAll.isSuccess ? (
            <p className="rounded-[var(--radius-card)] bg-[color-mix(in_srgb,var(--color-status-available)_12%,white)] px-3 py-2 text-sm text-[var(--color-status-available)]">
              {deleteAll.data.deleted} רכבים הועברו לסל המחזור. ניתן לשחזר אותם ממסך הרכבים.
            </p>
          ) : (
            <>
              <p className="mb-2 text-sm">
                כדי לאשר, הקלד <span className="font-[family-name:var(--font-mono)] font-semibold">{CONFIRM_WORD}</span> בשדה:
              </p>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRM_WORD}
                  className="max-w-xs"
                />
                <Button
                  variant="destructive"
                  disabled={confirmText.trim() !== CONFIRM_WORD || deleteAll.isPending}
                  onClick={() => deleteAll.mutate()}
                >
                  {deleteAll.isPending ? "מעביר…" : "העברת כל הרכבים לסל המחזור"}
                </Button>
              </div>

              {deleteAll.isError && (
                <p className="mt-3 rounded-[var(--radius-card)] bg-[color-mix(in_srgb,var(--color-status-sold)_10%,white)] px-3 py-2 text-sm text-[var(--color-status-sold)]">
                  {(deleteAll.error as Error)?.message}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {isManager && (counts?.deleted ?? 0) > 0 && (
        <Card className="border-[var(--color-status-sold)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--color-status-sold)]">
              <AlertTriangle size={18} /> ריקון סל המחזור
            </CardTitle>
            <p className="text-sm text-[var(--color-steel-dark)]">
              מחיקה סופית של {counts?.deleted} הרכבים שבסל המחזור, כולל התמונות שלהם.
              זו הפעולה היחידה במערכת שמוחקת נתונים לצמיתות — <strong>לא ניתן לשחזר</strong>.
            </p>
          </CardHeader>
          <CardContent>
            {emptyBin.isSuccess ? (
              <p className="rounded-[var(--radius-card)] bg-[var(--color-porcelain-dim)] px-3 py-2 text-sm">
                נמחקו לצמיתות {emptyBin.data.purged} רכבים.
              </p>
            ) : (
              <>
                <p className="mb-2 text-sm">
                  כדי לאשר, הקלד <span className="font-[family-name:var(--font-mono)] font-semibold">{CONFIRM_WORD}</span> בשדה:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={purgeText}
                    onChange={(e) => setPurgeText(e.target.value)}
                    placeholder={CONFIRM_WORD}
                    className="max-w-xs"
                  />
                  <Button
                    variant="destructive"
                    disabled={purgeText.trim() !== CONFIRM_WORD || emptyBin.isPending}
                    onClick={() => emptyBin.mutate()}
                  >
                    {emptyBin.isPending ? "מוחק…" : "מחיקה סופית"}
                  </Button>
                </div>
                {emptyBin.isError && (
                  <p className="mt-3 rounded-[var(--radius-card)] bg-[color-mix(in_srgb,var(--color-status-sold)_10%,white)] px-3 py-2 text-sm text-[var(--color-status-sold)]">
                    {(emptyBin.error as Error)?.message}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
