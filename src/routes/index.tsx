import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { MainLayout } from "../components/layout/MainLayout";
import { Home } from "../pages/public/Home";
import { EventsPage } from "../pages/public/EventsPage";
import { EventDetailPage } from "../pages/public/EventDetailPage";
import { NotFound } from "../pages/NotFound";
import { RouteErrorPage } from "../components/system/RouteErrorPage";

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
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
