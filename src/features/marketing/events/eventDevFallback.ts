import { SO3Event } from "./events.data";
import { PublicEvent } from "./EventCard";
import { PublicEventDetail, PublicEventMedia } from "./publicEvent.types";

export function normalizeStaticEventList(events: SO3Event[]): PublicEvent[] {
  return events.map((event) => ({
    id: event.id || event.slug,
    slug: event.slug,
    title: event.title,
    category_name: event.categoryLabel || 'Etkinlik',
    cover_url: event.coverImage || null,
    cover_thumbnail_url: event.coverImage || null,
    published_at: null,
  }));
}

export function normalizeStaticEventDetail(event: SO3Event): PublicEventDetail {
  const gallery: PublicEventMedia[] = [];
  
  if (event.gallery) {
    event.gallery.forEach((g: any, i: number) => {
      gallery.push({
        id: i,
        media_type: 'image',
        url: g.src,
        alt_text: g.alt
      });
    });
  }
  
  if (event.videos) {
    event.videos.forEach((v: any, i: number) => {
      gallery.push({
        id: 1000 + i,
        media_type: 'video',
        url: v.src,
        thumbnail_url: v.poster
      });
    });
  }

  return {
    id: event.id || event.slug,
    slug: event.slug,
    title: event.title,
    excerpt: (event as any).excerpt,
    content: (event as any).content,
    category: {
      name: event.categoryLabel || 'Etkinlik',
      slug: 'etkinlik'
    },
    cover: {
      url: event.coverImage || ''
    },
    gallery
  };
}
