import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { MainLayout } from "../components/layout/MainLayout";
import { Home } from "../pages/public/Home";
import { EventsPage } from "../pages/public/EventsPage";
import { EventDetailPage } from "../pages/public/EventDetailPage";
import { NotFound } from "../pages/NotFound";
import { RouteErrorPage } from "../components/system/RouteErrorPage";

// Lazy load admin modules
const AdminLayout = lazy(() => import("../admin/layouts/AdminLayout").then(m => ({ default: m.AdminLayout })));
const Login = lazy(() => import("../admin/pages/Login").then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import("../admin/pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Homepage = lazy(() => import("../admin/pages/Homepage").then(m => ({ default: m.Homepage })));
const MediaPage = lazy(() => import("../admin/pages/Media").then(m => ({ default: m.MediaPage })));
const AdminEventsList = lazy(() => import("../admin/pages/events/AdminEventsList").then(m => ({ default: m.AdminEventsList })));
const AdminEventEditor = lazy(() => import("../admin/pages/events/AdminEventEditor").then(m => ({ default: m.AdminEventEditor })));
const AdminBranchesList = lazy(() => import("../admin/pages/branches/AdminBranchesList").then(m => ({ default: m.AdminBranchesList })));
const AdminBranchEditor = lazy(() => import("../admin/pages/branches/AdminBranchEditor").then(m => ({ default: m.AdminBranchEditor })));

const AdminSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Yükleniyor...</div>}>
    {children}
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "etkinlikler",
        element: <EventsPage />,
      },
      {
        path: "etkinlikler/:slug",
        element: <EventDetailPage />,
      },
      // Redirects for onepage public routes
      {
        path: "branslar",
        element: <Navigate to="/#branslar" replace />,
      },
      {
        path: "egitmenler",
        element: <Navigate to="/#egitmenler" replace />,
      },
      {
        path: "topluluk",
        element: <Navigate to="/#topluluk" replace />,
      },
      {
        path: "iletisim",
        element: <Navigate to="/#iletisim" replace />,
      },
      
      // 404 Fallback
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
  {
    path: "/admin",
    element: <AdminSuspense><AdminLayout /></AdminSuspense>,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <AdminSuspense><Dashboard /></AdminSuspense>,
      },
      {
        path: "homepage",
        element: <AdminSuspense><Homepage /></AdminSuspense>,
      },
      {
        path: "login",
        element: <AdminSuspense><Login /></AdminSuspense>,
      },
      {
        path: "media",
        element: <AdminSuspense><MediaPage /></AdminSuspense>,
      },
      {
        path: "events",
        element: <AdminSuspense><AdminEventsList /></AdminSuspense>,
      },
      {
        path: "events/new",
        element: <AdminSuspense><AdminEventEditor /></AdminSuspense>,
      },
      {
        path: "events/:id",
        element: <AdminSuspense><AdminEventEditor /></AdminSuspense>,
      },
      {
        path: "branches",
        element: <AdminSuspense><AdminBranchesList /></AdminSuspense>,
      },
      {
        path: "branches/new",
        element: <AdminSuspense><AdminBranchEditor /></AdminSuspense>,
      },
      {
        path: "branches/:id",
        element: <AdminSuspense><AdminBranchEditor /></AdminSuspense>,
      },
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
