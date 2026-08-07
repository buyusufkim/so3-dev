import { EventCard, EventData } from "./EventCard";
import { EventsEmptyState } from "./EventsEmptyState";

interface EventListProps {
  events: EventData[];
}

export function EventList({ events }: EventListProps) {
  const visibleEvents = events.filter(event => event.status !== "draft");

  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-white text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 border-b border-[#0A0A0A]/10 pb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Yaklaşan Etkinlikler</h2>
        </div>

        {visibleEvents.length === 0 ? (
          <EventsEmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
