import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { MainLayout } from "../components/layout/MainLayout";
import { Home } from "../pages/public/Home";
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
