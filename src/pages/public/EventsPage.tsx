import { EventsHero } from "../../features/marketing/events/EventsHero";
import { EventList } from "../../features/marketing/events/EventList";
import { EventsCommunityLink } from "../../features/marketing/events/EventsCommunityLink";
import { EventData } from "../../features/marketing/events/EventCard";

export function EventsPage() {
  // Geçici olarak boş etkinlik listesi kullanıyoruz.
  // Gerçek veri veya CMS entegrasyonu tamamlandığında bu alan gerçek verilerle doldurulacaktır.
  const upcomingEvents: EventData[] = [];

  return (
    <main className="w-full flex flex-col min-h-screen bg-white">
      <EventsHero />
      <EventList events={upcomingEvents} />
      <EventsCommunityLink />
    </main>
  );
}
