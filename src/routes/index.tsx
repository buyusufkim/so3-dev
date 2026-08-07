import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MainLayout } from "../components/layout/MainLayout";
import { Home } from "../pages/public/Home";
import { PlaceholderPage } from "../pages/public/PlaceholderPage";
import { AdminDashboard, MemberDashboard, TrainerDashboard, ReceptionDashboard } from "../pages/Dashboards";
import { NotFound } from "../pages/NotFound";
import { DesignConceptPage } from "../features/design-concept/DesignConceptPage";
import { DesignConceptV3Page } from "../features/design-concept-v3/DesignConceptV3Page";
import { DesignConceptV31Page } from "../features/design-concept-v3-1/DesignConceptV31Page";

const router = createBrowserRouter([
  {
    path: "/design-concept",
    element: <DesignConceptPage />,
  },
  {
    path: "/design-concept-v3",
    element: <DesignConceptV3Page />,
  },
  {
    path: "/design-concept-v3-1",
    element: <DesignConceptV31Page />,
  },
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      // Public Pages placeholders
      {
        path: "so3-deneyimi",
        element: <PlaceholderPage title="SO3 Deneyimi" />,
      },
      {
        path: "branslar",
        element: <PlaceholderPage title="Branşlar" />,
      },
      {
        path: "egitmenler",
        element: <PlaceholderPage title="Eğitmen Kadrosu" />,
      },
      {
        path: "topluluk",
        element: <PlaceholderPage title="Topluluk Etkinlikleri" />,
      },
      {
        path: "etkinlikler",
        element: <PlaceholderPage title="Etkinlik Takvimi" />,
      },
      {
        path: "basarilar",
        element: <PlaceholderPage title="Başarılarımız" />,
      },
      {
        path: "galeri",
        element: <PlaceholderPage title="Galeri" />,
      },
      {
        path: "360-tur",
        element: <PlaceholderPage title="360° Sanal Tur" />,
      },
      {
        path: "iletisim",
        element: <PlaceholderPage title="İletişim" />,
      },
      {
        path: "giris",
        element: <PlaceholderPage title="Üye Girişi" />,
      },
      
      // App areas placeholders
      {
        path: "admin",
        element: <AdminDashboard />,
      },
      {
        path: "uye",
        element: <MemberDashboard />,
      },
      {
        path: "antrenor",
        element: <TrainerDashboard />,
      },
      {
        path: "resepsiyon",
        element: <ReceptionDashboard />,
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
