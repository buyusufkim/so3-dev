import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getEventBySlug } from "../../features/marketing/events/events.data";
import { NotFound } from "../NotFound";
import { EventDetailHero } from "../../features/marketing/events/EventDetailHero";
import { EventMediaWall } from "../../features/marketing/events/EventMediaWall";
import { EventRelated } from "../../features/marketing/events/EventRelated";
import { PageSEO } from "@/components/seo/PageSEO";

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<any>(null);
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
        const res = await fetch(`/api/public/events/${slug}`);
        if (res.status === 404) {
          const staticFallback = slug ? getEventBySlug(slug) : undefined;
          if (staticFallback) {
            setEvent(staticFallback);
            setNotFound(false);
          } else {
            setNotFound(true);
          }
          return;
        }
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();
        setEvent(data.data);
        setNotFound(false);
      } catch (err) {
        const staticFallback = slug ? getEventBySlug(slug) : undefined;
        if (staticFallback) {
          setEvent(staticFallback);
          setNotFound(false);
        } else {
          setNotFound(true);
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
        <div className="text-white/50 animate-pulse font-medium">Etkinlik Yükleniyor...</div>
      </main>
    );
  }

  if (notFound || !event) {
    return (
      <>
        <PageSEO title="Etkinlik Bulunamadı | SO3 Personal Training" />
        <NotFound />
      </>
    );
  }

  const seoTitle = event.seo_title || `${event.title} | SO3 Personal Training`;
  const seoDescription = event.seo_description || event.excerpt || `${event.title} etkinliğinden SO3 topluluğuna ait gerçek fotoğraf ve video içeriklerini keşfedin.`;
  const coverImg = event.cover_url || event.coverImage;

  return (
    <main className="w-full flex flex-col min-h-screen bg-white">
      <PageSEO 
        title={seoTitle}
        description={seoDescription}
        canonical={`https://so3pt.com.tr/etkinlikler/${event.slug}`}
        ogType="article"
        ogImage={coverImg ? (coverImg.startsWith('http') ? coverImg : `https://so3pt.com.tr${coverImg}`) : undefined}
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
