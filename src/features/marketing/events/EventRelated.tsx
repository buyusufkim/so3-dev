import { publicApiFetch } from "../../../lib/devFallback";
import { useState, useEffect } from "react";
import { EventCard, PublicEvent } from "./EventCard";

export function EventRelated({ currentSlug }: { currentSlug: string }) {
  const [relatedEvents, setRelatedEvents] = useState<PublicEvent[]>([]);

  useEffect(() => {
    async function fetchRelated() {
      try {
        const res = await publicApiFetch('/api/public/events?limit=10');
        if (!res.ok) throw new Error('API Error');
        const json = await res.json();
        if (json.data && json.data.items) {
          const filtered = json.data.items
            .filter((e: any) => e.slug !== currentSlug)
            .slice(0, 3);
          setRelatedEvents(filtered);
        } else {
          setRelatedEvents([]);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          try {
            const m = await import('./events.data');
            const { normalizeStaticEventList } = await import('./eventDevFallback');
            setRelatedEvents(normalizeStaticEventList(m.getRelatedEvents(currentSlug, 3)));
          } catch (fallbackErr) {
            setRelatedEvents([]);
          }
        } else {
          setRelatedEvents([]);
        }
      }
    }
    
    fetchRelated();
  }, [currentSlug]);

  if (relatedEvents.length === 0) return null;

  return (
    <section className="py-20 md:py-24 px-4 sm:px-6 lg:px-12 bg-[#0A0A0A] text-white">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-16 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">
                SO3'te Başka Neler Yaptık?
              </h2>
            </div>
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
              Diğer Etkinlikleri İncele
            </h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {relatedEvents.map((event, idx) => (
            <div key={event.slug || idx} className="h-[300px] md:h-[400px]">
              <EventCard event={event} className="w-full h-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
