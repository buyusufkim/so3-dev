import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MainLayout } from "../components/layout/MainLayout";
import { Home } from "../pages/public/Home";
import { PlaceholderPage } from "../pages/public/PlaceholderPage";
import { BranchesPage } from "../pages/public/BranchesPage";
import { TrainersPage } from "../pages/public/TrainersPage";
import { CommunityPage } from "../pages/public/CommunityPage";
import { EventsPage } from "../pages/public/EventsPage";
import { AchievementsPage } from "../pages/public/AchievementsPage";
import { TourPage } from "../pages/public/TourPage";
import { ContactPage } from "../pages/public/ContactPage";
import { AdminDashboard, MemberDashboard, TrainerDashboard, ReceptionDashboard } from "../pages/Dashboards";
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
      // Public Pages placeholders
      {
        path: "branslar",
        element: <BranchesPage />,
      },
      {
        path: "egitmenler",
        element: <TrainersPage />,
      },
      {
        path: "topluluk",
        element: <CommunityPage />,
      },
      {
        path: "etkinlikler",
        element: <EventsPage />,
      },
      {
        path: "basarilar",
        element: <AchievementsPage />,
      },
      {
        path: "360-tur",
        element: <TourPage />,
      },
      {
        path: "iletisim",
        element: <ContactPage />,
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
