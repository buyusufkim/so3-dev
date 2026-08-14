import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { useEffect } from "react";
import { WhatsAppButton } from "../ui/WhatsAppButton";
import { PublicSiteSettingsProvider } from "@/features/site-settings/PublicSiteSettingsProvider";

export function MainLayout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollBehavior = isReducedMotion ? "auto" : "smooth";

    if (hash) {
      const timer = setTimeout(() => {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: scrollBehavior });
        }
      }, 0);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo({ top: 0, behavior: scrollBehavior });
    }
  }, [pathname, hash]);

  return (
    <PublicSiteSettingsProvider>
      <div className="flex min-h-screen flex-col bg-brand-black text-brand-off-white selection:bg-brand-off-white selection:text-brand-black">
        <Header />
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
        <Footer />
        <WhatsAppButton />
      </div>
    </PublicSiteSettingsProvider>
  );
}
