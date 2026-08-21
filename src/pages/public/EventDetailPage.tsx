import { publicApiFetch } from "../../lib/devFallback";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { NotFound } from "../NotFound";
import { EventDetailHero } from "../../features/marketing/events/EventDetailHero";
import { EventMediaWall } from "../../features/marketing/events/EventMediaWall";
import { EventRelated } from "../../features/marketing/events/EventRelated";
import { PageSEO } from "@/components/seo/PageSEO";
import { PublicEventDetail } from "../../features/marketing/events/publicEvent.types";

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function fetchEventDetail() {
      try {
        setLoading(true);
        let resolvedData: PublicEventDetail | null = null;
        let isApi404 = false;

        try {
          const res = await publicApiFetch(`/api/public/events/${slug}`);
          if (res.ok) {
            const json = await res.json();
            resolvedData = json.data;
          } else {
            if (res.status === 404) {
              isApi404 = true;
            }
            throw new Error(isApi404 ? "Not Found" : "API Error");
          }
        } catch (apiErr) {
          if (import.meta.env.DEV) {
            // Attempt DEV static fallback
            try {
              const m = await import('../../features/marketing/events/events.data');
              const staticFallback = m.getEventBySlug(slug as string);
              if (staticFallback) {
                const { normalizeStaticEventDetail } = await import('../../features/marketing/events/eventDevFallback');
                resolvedData = normalizeStaticEventDetail(staticFallback);
              } else {
                setNotFound(true);
                return;
              }
            } catch (fallbackErr) {
              if (isApi404) setNotFound(true);
            }
          } else {
            if (isApi404) {
              setNotFound(true);
              return;
            }
          }
        }

        if (resolvedData) {
          setEvent(resolvedData);
          setNotFound(false);
        } else if (!isApi404 && !import.meta.env.DEV) {
          setEvent(null);
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchEventDetail();
  }, [slug]);

  if (loading) {
    return (
      <main className="w-full flex items-center justify-center min-h-screen bg-[#0A0A0A] text-white">
        <PageSEO title="Etkinlik Yükleniyor... | SO3 Personal Training" robots="noindex, follow" />
        <div className="text-white/50 animate-pulse font-medium">Etkinlik Yükleniyor...</div>
      </main>
    );
  }

  if (notFound) {
    return <NotFound />;
  }

  if (!event) {
    return (
      <main className="w-full flex items-center justify-center min-h-screen bg-[#0A0A0A] text-white">
        <PageSEO 
          title="Etkinlik Yüklenemedi | SO3 Personal Training" 
          description="Etkinlik bilgileri şu anda görüntülenemiyor."
          robots="noindex, follow" 
        />
        <div className="text-red-400 font-medium">Etkinlik yüklenemedi.</div>
      </main>
    );
  }

  const seoTitle = event.seo_title || `${event.title} | SO3 Personal Training`;
  const seoDescription = event.seo_description || event.excerpt || `${event.title} etkinliğinden SO3 topluluğuna ait gerçek fotoğraf ve video içeriklerini keşfedin.`;
  const coverImg = event.cover?.url;

  return (
    <main className="w-full flex flex-col min-h-screen bg-white">
      <PageSEO 
        title={seoTitle}
        description={seoDescription}
        canonical={`https://so3pt.com.tr/etkinlikler/${event.slug}`}
        ogType="article"
        ogImage={coverImg ? (coverImg.startsWith('http') ? coverImg : `https://so3pt.com.tr${coverImg}`) : undefined}
        robots="index, follow"
      />
      
      <EventDetailHero event={event} />

      {(event.excerpt || event.content) && (
        <div className="w-full max-w-4xl mx-auto px-6 md:px-8 mt-12 md:mt-16 text-[#0A0A0A]">
          {event.excerpt && (
            <p className="text-lg md:text-xl font-medium leading-relaxed text-[#0A0A0A]/80 mb-6 border-l-2 border-[#851C35] pl-4 italic">
              {event.excerpt}
            </p>
          )}
          {event.content && (
            <div className="prose prose-lg text-[#0A0A0A]/70 leading-relaxed whitespace-pre-line">
              {event.content}
            </div>
          )}
        </div>
      )}
      
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 mt-12 md:mt-16">
        <EventMediaWall event={event} />
      </div>

      <EventRelated currentSlug={event.slug} />
    </main>
  );
}
