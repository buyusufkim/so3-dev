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
        const res = await fetch(`/api/public/events/${slug}`);
        if (!res.ok) {
          if (res.status === 404) {
            setNotFound(true);
            return;
          }
          throw new Error("API Error");
        }
        const json = await res.json();
        setEvent(json.data);
        setNotFound(false);
      } catch (err) {
        if (import.meta.env.DEV) {
          import('../../features/marketing/events/events.data').then(m => {
            const staticFallback = slug ? m.getEventBySlug(slug) : undefined;
            if (staticFallback) {
              
              // Normalize to PublicEventDetail
              const gallery: any[] = [];
              if (staticFallback.gallery) {
                 staticFallback.gallery.forEach((g: any, i: number) => {
                    gallery.push({
                       id: i,
                       media_type: 'image',
                       url: g.src,
                       alt_text: g.alt
                    });
                 });
              }
              if (staticFallback.videos) {
                 staticFallback.videos.forEach((v: any, i: number) => {
                    gallery.push({
                       id: 1000 + i,
                       media_type: 'video',
                       url: v.src,
                       thumbnail_url: v.poster
                    });
                 });
              }

              const normalized: PublicEventDetail = {
                id: staticFallback.id || staticFallback.slug,
                slug: staticFallback.slug,
                title: staticFallback.title,
                excerpt: (staticFallback as any).excerpt,
                content: (staticFallback as any).content,
                category: {
                  name: staticFallback.categoryLabel || 'Etkinlik',
                  slug: 'etkinlik'
                },
                cover: {
                  url: staticFallback.coverImage || ''
                },
                gallery
              };

              setEvent(normalized);
              setNotFound(false);
            } else {
              setNotFound(true);
            }
          }).catch(() => setNotFound(true));
        } else {
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
        <div className="text-white/50 animate-pulse font-medium">Etkinlik Yükleniyor...</div>
      </main>
    );
  }

  if (notFound) {
    return (
      <>
        <PageSEO title="Etkinlik Bulunamadı | SO3 Personal Training" />
        <NotFound />
      </>
    );
  }

  if (!event) {
    return (
      <main className="w-full flex items-center justify-center min-h-screen bg-[#0A0A0A] text-white">
        <div className="text-red-400 font-medium">Etkinlik yüklenemedi.</div>
      </main>
    );
  }

  const seoTitle = event.seo_title || `${event.title} | SO3 Personal Training`;
  const seoDescription = event.seo_description || event.excerpt || `${event.title} etkinliğinden SO3 topluluğuna ait gerçek fotoğraf ve video içeriklerini keşfedin.`;
  const coverImg = event.cover?.url || (event as any).cover_url;

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
