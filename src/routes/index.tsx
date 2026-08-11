import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { MainLayout } from "../components/layout/MainLayout";
import { Home } from "../pages/public/Home";
import { TourPage } from "../pages/public/TourPage";
import { NotFound } from "../pages/NotFound";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
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
      // Kept real pages
      {
        path: "360-tur",
        element: <Navigate to="/#tour" replace />,
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
