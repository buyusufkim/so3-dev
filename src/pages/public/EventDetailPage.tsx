import { useParams } from "react-router-dom";
import { getEventBySlug } from "../../features/marketing/events/events.data";
import { NotFound } from "../NotFound";
import { EventDetailHero } from "../../features/marketing/events/EventDetailHero";
import { EventMediaWall } from "../../features/marketing/events/EventMediaWall";
import { EventRelated } from "../../features/marketing/events/EventRelated";
import { PageSEO } from "@/components/seo/PageSEO";

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  
  if (!slug) return (
    <>
      <PageSEO title="Etkinlik Bulunamadı | SO3 Personal Training" />
      <NotFound />
    </>
  );
  
  const event = getEventBySlug(slug);
  
  if (!event) return (
    <>
      <PageSEO title="Etkinlik Bulunamadı | SO3 Personal Training" />
      <NotFound />
    </>
  );

  return (
    <main className="w-full flex flex-col min-h-screen bg-white">
      <PageSEO 
        title={`${event.title} | SO3 Personal Training`}
        description={`${event.title} etkinliğinden SO3 topluluğuna ait gerçek fotoğraf ve video içeriklerini keşfedin.`}
        canonical={`https://so3pt.com.tr/etkinlikler/${event.slug}`}
        ogType="article"
        ogImage={event.coverImage ? `https://so3pt.com.tr${event.coverImage}` : undefined}
      />
      <EventDetailHero event={event} />
      
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 mt-16 md:mt-24">
        <EventMediaWall event={event} />
      </div>
      <EventRelated currentSlug={event.slug} />
    </main>
  );
}
