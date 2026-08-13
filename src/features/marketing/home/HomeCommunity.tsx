import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { featuredEvents as staticFeaturedEvents } from "../events/events.data";

interface PublicEvent {
  slug: string;
  title: string;
  excerpt: string;
  category_name: string;
  cover_url: string;
  cover_thumbnail_url: string | null;
  cover_alt_text: string | null;
}

export function HomeCommunity() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchFeaturedEvents() {
      try {
        const response = await fetch('/api/public/events?featured=1&limit=6');
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          setEvents(data.data);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error("Failed to load dynamic events, using fallback in dev");
        setError(true);
        if (import.meta.env.DEV) {
          const mapped = staticFeaturedEvents.map(e => ({
            slug: e.slug,
            title: e.title,
            excerpt: e.description,
            category_name: e.category,
            cover_url: e.image,
            cover_thumbnail_url: e.image,
            cover_alt_text: e.imageAlt || ''
          }));
          setEvents(mapped);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchFeaturedEvents();
  }, []);

  if (!loading && events.length === 0 && !import.meta.env.DEV) {
    return null;
  }

  return (
    <section id="topluluk" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#F4F1EB] text-[#0A0A0A] scroll-mt-24 md:scroll-mt-28">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center max-w-4xl mx-auto mb-16 md:mb-24">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
              SO3 / TOPLULUK
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.05] mb-8">
            SO3 Ailesi Çok Sosyal
          </h2>
          <p className="text-lg md:text-xl text-[#0A0A0A]/70 font-medium max-w-2xl mx-auto">
            İlk günden beridir prensibimiz sadece bir spor salonu değil hayat dolu bir aile olmaktı. Öyle de olduk! SO3 ile kano etkinlikleri, doğa yürüyüşleri, takımlı müsabakalar, salon içi toplu antrenman etkinlikleri, kahvaltı buluşmaları gibi yılın her ayını dolu dolu geçiriyoruz.
          </p>
        </div>

        {error && !import.meta.env.DEV && (
          <div className="text-center py-12 text-[#0A0A0A]/50">
            Etkinlikler şu anda görüntülenemiyor.
          </div>
        )}

        {!error || import.meta.env.DEV ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12 md:mb-16">
            {events.map((event) => (
              <Link 
                key={event.slug}
                to={`/etkinlikler/${event.slug}`}
                className="group flex flex-col focus:outline-none"
              >
                <div className="relative aspect-[4/3] rounded-md overflow-hidden bg-black mb-6">
                  <img 
                    src={event.cover_thumbnail_url || event.cover_url} 
                    alt={event.cover_alt_text || ""} 
                    loading="lazy" 
                    className="w-full h-full object-cover opacity-90 saturate-[0.85] contrast-[1.05] transition-all duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:saturate-100" 
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-[#0A0A0A] text-[10px] font-bold tracking-wider uppercase rounded-sm">
                      {event.category_name}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-[#0A0A0A] mb-3 group-hover:text-[#851C35] transition-colors leading-tight">
                  {event.title}
                </h3>
                {event.excerpt && (
                  <p className="text-[#0A0A0A]/70 line-clamp-2">
                    {event.excerpt}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="flex justify-center">
          <Link 
            to="/etkinlikler"
            className="group flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#0A0A0A] hover:text-[#851C35] transition-colors"
          >
            Tüm Etkinlikleri Keşfet
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </div>

      </div>
    </section>
  );
}
