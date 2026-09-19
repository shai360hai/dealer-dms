import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/useAuth";
import { PublicLayout } from "./components/PublicLayout";
import { AdminLayout } from "./components/AdminLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Public pages load eagerly — they're the first thing most visitors see.
import Home from "./pages/public/Home";
import Inventory from "./pages/public/Inventory";
import VehicleDetail from "./pages/public/VehicleDetail";
<<<<<<< HEAD
=======
import Favorites from "./pages/public/Favorites";
import Compare from "./pages/public/Compare";
>>>>>>> 03934ce (Add share previews, inquiry email, vehicle comparison)
import PublicNotFound from "./pages/public/NotFound";
import Login from "./pages/admin/Login";

// Admin pages are lazy-loaded: a public-site visitor never downloads any
// of this code.
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const VehiclesList = lazy(() => import("./pages/admin/VehiclesList"));
const NewVehicle = lazy(() => import("./pages/admin/NewVehicle"));
const EditVehicle = lazy(() => import("./pages/admin/EditVehicle"));
const Inquiries = lazy(() => import("./pages/admin/Inquiries"));
const Activity = lazy(() => import("./pages/admin/Activity"));
const Settings = lazy(() => import("./pages/admin/Settings"));

function AdminFallback() {
  return <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--color-steel-dark)]">טוען...</div>;
}

export default function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public site */}
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="vehicles/:slug" element={<VehicleDetail />} />
<<<<<<< HEAD
=======
              <Route path="favorites" element={<Favorites />} />
              <Route path="compare" element={<Compare />} />
>>>>>>> 03934ce (Add share previews, inquiry email, vehicle comparison)
            </Route>

            {/* Admin */}
            <Route path="admin/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route
                path="admin"
                element={
                  <Suspense fallback={<AdminFallback />}>
                    <AdminLayout />
                  </Suspense>
                }
              >
                <Route index element={<Suspense fallback={<AdminFallback />}><Dashboard /></Suspense>} />
                <Route path="vehicles" element={<Suspense fallback={<AdminFallback />}><VehiclesList /></Suspense>} />
                <Route path="vehicles/new" element={<Suspense fallback={<AdminFallback />}><NewVehicle /></Suspense>} />
                <Route path="vehicles/:id/edit" element={<Suspense fallback={<AdminFallback />}><EditVehicle /></Suspense>} />
                <Route path="inquiries" element={<Suspense fallback={<AdminFallback />}><Inquiries /></Suspense>} />
                <Route path="activity" element={<Suspense fallback={<AdminFallback />}><Activity /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<AdminFallback />}><Settings /></Suspense>} />
              </Route>
            </Route>

            <Route path="*" element={<PublicNotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
