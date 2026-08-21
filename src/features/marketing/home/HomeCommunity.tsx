import { publicApiFetch } from "../../../lib/devFallback";
import { useState, useEffect } from "react";
import { type PublicCommunitySectionContent } from "@/features/homepage/publicHomepageContent";
import { Link } from "react-router-dom";
import { PublicEvent } from "../events/EventCard";

interface HomeCommunityProps {
  content: PublicCommunitySectionContent;
}

export function HomeCommunity({ content }: HomeCommunityProps) {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        setError(false);
        const res = await publicApiFetch('/api/public/events?featured=1&limit=6');
        if (!res.ok) throw new Error('API Error');
        const json = await res.json();
        if (json.data && json.data.items) {
          setEvents(json.data.items);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          import('../events/events.data').then(async (m) => {
             const { normalizeStaticEventList } = await import('../events/eventDevFallback');
             const featured = m.EVENTS_DATA.filter((e) => e.featured);
             const fallbackEvents = featured.length > 0 ? featured.slice(0, 6) : m.EVENTS_DATA.slice(0, 6);
             setEvents(normalizeStaticEventList(fallbackEvents));
          }).catch(() => setError(true));
        } else {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchEvents();
  }, []);

  const gridClasses = [
    "lg:col-span-5 lg:row-span-2 h-[280px] lg:h-[460px]", // Item 1 (taller)
    "lg:col-span-3 lg:row-span-2 h-[280px] lg:h-[460px]", // Item 2 (taller)
    "lg:col-span-4 lg:row-span-1 h-[220px] lg:h-[220px]", // Item 3
    "lg:col-span-4 lg:row-span-1 h-[220px] lg:h-[220px]", // Item 4
    "lg:col-span-6 lg:row-span-1 h-[220px] lg:h-[220px]", // Item 5 (if 6 items)
    "lg:col-span-6 lg:row-span-1 h-[220px] lg:h-[220px]", // Item 6 (if 6 items)
  ];

  return (
    <section id="topluluk" className="py-20 md:py-24 px-4 sm:px-6 lg:px-12 bg-[#F4F1EB] text-[#0A0A0A] scroll-mt-24 md:scroll-mt-28">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center max-w-4xl mx-auto mb-16 md:mb-24">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
              {content.eyebrow}
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.05] mb-8">
            {content.headline}
          </h2>
          {content.intro && (
            <p className="text-lg md:text-xl text-[#0A0A0A]/70 font-medium max-w-2xl mx-auto">
              {content.intro}
            </p>
          )}
        </div>

        {error ? (
          <div className="text-center py-12 text-[#0A0A0A]/40 font-medium">Etkinlikler şu anda görüntülenemiyor.</div>
        ) : !loading && events.length === 0 ? (
          <div className="text-center py-12 text-[#0A0A0A]/40 font-medium">Şu an için öne çıkan bir etkinlik bulunmuyor.</div>
        ) : !loading && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2 gap-4 md:gap-6 mb-12 md:mb-16">
            {events.map((event, idx) => (
              <Link 
                to={`/etkinlikler/${event.slug}`} 
                key={event.slug}
                className={`${gridClasses[idx % gridClasses.length]} group relative rounded-md overflow-hidden bg-black`}
              >
                {event.cover_thumbnail_url || event.cover_url ? (
                  <img src={event.cover_thumbnail_url || event.cover_url!} alt={event.title} loading="lazy" className="w-full h-full object-cover opacity-90 saturate-[0.85] contrast-[1.05] transition-all duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:saturate-100" />
                ) : (
                  <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <span className="text-[#F4F1EB]/10 text-4xl font-black tracking-tighter">SO3</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-[#0A0A0A]/10 to-transparent opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="absolute bottom-5 left-5 right-5 text-white pointer-events-none">
                  <span className="text-xs font-bold uppercase tracking-widest block drop-shadow-md">{event.category_name || 'Etkinlik'}</span>
                  <span className="text-sm font-medium block mt-1">{event.title}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {content.cta_label && (
          <div className="flex justify-center mt-12">
            <Link 
              to="/etkinlikler"
              className="group flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#0A0A0A] hover:text-[#851C35] transition-colors"
            >
              {content.cta_label}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
