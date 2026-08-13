import { useState, useEffect } from "react";
import { EVENTS_DATA } from "./events.data";
import { EventCard, EventCardData } from "./EventCard";

export function EventArchive() {
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/public/events?limit=50');
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();

        if (data.data && data.data.length > 0) {
          setEvents(data.data);
        } else {
          // Fallback to static if no database records
          setEvents(EVENTS_DATA as unknown as EventCardData[]);
        }
      } catch (err) {
        setEvents(EVENTS_DATA as unknown as EventCardData[]);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const featuredEvent = events[0];
  const supportEvents = events.slice(1, 3);
  const remainingEvents = events.slice(3);

  return (
    <section className="py-20 md:py-24 px-4 sm:px-6 lg:px-12 bg-white text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        
        <div className="flex items-center gap-3 mb-8 md:mb-12">
          <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#0A0A0A]/50">
            Tüm Etkinlikler
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#0A0A0A]/40">Etkinlikler yükleniyor...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 text-[#0A0A0A]/40">Henüz yayınlanmış bir etkinlik bulunmuyor.</div>
        ) : (
          <>
            {/* Featured + Support Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-4 md:mb-6">
              {featuredEvent && (
                <div className="lg:col-span-7 h-[400px] md:h-[500px]">
                  <EventCard event={featuredEvent} className="w-full h-full" isLarge={true} />
                </div>
              )}
              
              {(supportEvents.length > 0) && (
                <div className="lg:col-span-5 flex flex-col gap-4 md:gap-6 h-[400px] md:h-[500px]">
                  {supportEvents.map((event, idx) => (
                    <div key={event.slug || idx} className="flex-1">
                      <EventCard event={event} className="w-full h-full" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Remaining Events Grid */}
            {remainingEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {remainingEvents.map((event, idx) => (
                  <div key={event.slug || idx} className="h-[300px]">
                    <EventCard event={event} className="w-full h-full" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </section>
  );
}
