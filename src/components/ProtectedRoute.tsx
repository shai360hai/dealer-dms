import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/database";

const ROLE_RANK: Record<UserRole, number> = { editor: 1, admin: 2, super_admin: 3 };

export function ProtectedRoute({ minRole }: { minRole?: UserRole }) {
  const { session, profile, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-ink)] text-[var(--color-porcelain)]">
        טוען...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  // Signed in, but not (or no longer) staff: the database would refuse
  // every request anyway, so say so rather than render an empty admin.
  if (!profile || !profile.active) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-ink)] px-4 text-center text-[var(--color-porcelain)]">
        <p>{profile ? "החשבון שלך הושבת. לפרטים פנו למנהל המערכת." : "לחשבון זה אין גישה לממשק הניהול."}</p>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-[var(--radius-card)] border border-[var(--color-steel)] px-4 py-2 text-sm"
        >
          התנתקות
        </button>
      </div>
    );
  }

  if (minRole && ROLE_RANK[profile.role] < ROLE_RANK[minRole]) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
