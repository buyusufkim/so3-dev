import { EventsHero } from "../../features/marketing/events/EventsHero";
import { EventArchive } from "../../features/marketing/events/EventArchive";
import { PageSEO } from "@/components/seo/PageSEO";

export function EventsPage() {
  return (
    <main className="w-full flex flex-col min-h-screen bg-white">
      <PageSEO 
        title="SO3 Etkinlikleri | SO3 Personal Training Kayseri"
        description="SO3 topluluğunun kano, doğa yürüyüşleri, voleybol ve grup antrenmanlarından gerçek etkinlik karelerini keşfedin."
        canonical="https://so3pt.com.tr/etkinlikler"
        ogType="website"
      />
      <EventsHero />
      <EventArchive />
    </main>
  );
}
