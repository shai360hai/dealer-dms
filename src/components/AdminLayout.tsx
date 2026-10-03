import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { LayoutDashboard, Car, MessageSquare, History, Settings, LogOut, Menu, X } from "lucide-react";
import { cn } from "./ui/cn";
import { useAuth } from "../hooks/useAuth";
import { useInquiryCounts } from "../hooks/useInquiries";

const NAV = [
  { to: "/admin", label: "לוח בקרה", icon: LayoutDashboard, end: true },
  { to: "/admin/vehicles", label: "רכבים", icon: Car },
  { to: "/admin/inquiries", label: "פניות לקוחות", icon: MessageSquare },
  { to: "/admin/activity", label: "יומן פעילות", icon: History },
  { to: "/admin/settings", label: "הגדרות", icon: Settings },
];

export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  // A new lead sitting unnoticed is a lost sale, so the count is always
  // visible rather than only on the inquiries screen.
  const { data: inquiryCounts } = useInquiryCounts();

  async function handleLogout() {
    await signOut();
    navigate("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-porcelain)]">
      {mobileOpen && <button aria-label="סגירה" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 end-0 z-40 w-64 shrink-0 border-s border-[var(--color-steel-dark)] bg-[var(--color-ink)] p-4 transition-transform duration-300 ease-[var(--ease-signature)] lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.3em] text-[var(--color-chrome-gold)]">Dealer DMS</p>
          <button className="text-[var(--color-porcelain)] lg:hidden" onClick={() => setMobileOpen(false)} aria-label="סגירה">
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2 text-sm transition-[background-color,box-shadow] duration-200",
                  isActive
                    ? "bg-[var(--color-navy)] text-[var(--color-porcelain)] shadow-[var(--shadow-glow-navy)]"
                    : "text-[var(--color-steel)] hover:bg-white/5",
                )
              }
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="flex-1">{label}</span>
              {to === "/admin/inquiries" && (inquiryCounts?.new ?? 0) > 0 && (
                <span className="rounded-full bg-[var(--color-chrome-gold)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-ink)]">
                  {inquiryCounts?.new}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-4 start-4 end-4 border-t border-[var(--color-steel-dark)] pt-4">
          <p className="px-3 text-sm text-[var(--color-porcelain)]">{profile?.full_name ?? "—"}</p>
          <p className="px-3 text-xs text-[var(--color-steel)]">{profile?.email}</p>
          <button onClick={handleLogout} className="mt-2 flex w-full items-center gap-3 rounded-[var(--radius-card)] px-3 py-2 text-sm text-[var(--color-steel)] hover:bg-white/5">
            <LogOut size={18} strokeWidth={1.75} />
            התנתקות
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-steel)] px-4 py-3 lg:justify-end">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="תפריט">
            <Menu size={20} />
          </button>
          <Link to="/" target="_blank" className="text-xs text-[var(--color-steel-dark)] underline">
            צפייה באתר הציבורי
          </Link>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
