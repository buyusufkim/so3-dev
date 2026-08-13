import { getRelatedEvents } from "./events.data";
import { EventCard } from "./EventCard";

export function EventRelated({ currentSlug }: { currentSlug: string }) {
  const relatedEvents = getRelatedEvents(currentSlug, 3);

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
          {relatedEvents.map(event => (
            <div key={event.id} className="h-[300px] md:h-[400px]">
              <EventCard event={event} className="w-full h-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
