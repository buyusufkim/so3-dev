export type EventCategory =
  | "kano"
  | "doga-yuruyusu"
  | "voleybol"
  | "toplu-antrenman";

export type EventMedia = {
  src: string;
  alt: string;
  orientation?: "portrait" | "landscape";
  objectPosition?: string;
};

export type EventVideo = {
  src: string;
  poster?: string;
  orientation?: "portrait" | "landscape";
};

export type EventStoryItem =
  | { type: "image"; index: number }
  | { type: "video"; index: number };

export type SO3Event = {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  categoryLabel: string;

  coverImage?: string;
  gallery: EventMedia[];
  videos: EventVideo[];
  
  mediaStory?: EventStoryItem[];

  featured?: boolean;
};

export const EVENTS_DATA: SO3Event[] = [
  {
    id: "kano-etkinligi",
    slug: "kano-etkinligi",
    title: "Kano Etkinliği",
    category: "kano",
    categoryLabel: "Kano Etkinliği",
    featured: true,
    coverImage: "/media/so3/events/kano-etkinligi/cover.webp",
    gallery: [
      { src: "/media/so3/events/kano-etkinligi/gallery/01.webp", alt: "SO3 kano etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/kano-etkinligi/gallery/02.webp", alt: "SO3 kano etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/kano-etkinligi/gallery/03.webp", alt: "SO3 kano etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/kano-etkinligi/gallery/04.webp", alt: "SO3 kano etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/kano-etkinligi/gallery/05.webp", alt: "SO3 kano etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/kano-etkinligi/gallery/06.webp", alt: "SO3 kano etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/kano-etkinligi/gallery/07.webp", alt: "SO3 kano etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/kano-etkinligi/gallery/08.webp", alt: "SO3 kano etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/kano-etkinligi/gallery/09.webp", alt: "SO3 kano etkinliğinden bir an", orientation: "portrait" }
    ],
    videos: [
      { src: "/media/so3/events/kano-etkinligi/video/01.mp4", poster: "/media/so3/events/kano-etkinligi/video/01-poster.webp", orientation: "portrait" },
      { src: "/media/so3/events/kano-etkinligi/video/02.mp4", poster: "/media/so3/events/kano-etkinligi/video/02-poster.webp", orientation: "portrait" }
    ],
    mediaStory: [
      { type: "image", index: 0 },
      { type: "video", index: 0 },
      { type: "image", index: 1 },
      { type: "image", index: 2 },
      { type: "image", index: 3 },
      { type: "image", index: 4 },
      { type: "video", index: 1 },
      { type: "image", index: 5 },
      { type: "image", index: 6 },
      { type: "image", index: 7 },
      { type: "image", index: 8 }
    ],
  },
  {
    id: "gomeda-vadisi-yuruyusu",
    slug: "gomeda-vadisi-yuruyusu",
    title: "Gomeda Vadisi Yürüyüşü",
    category: "doga-yuruyusu",
    categoryLabel: "Doğa Yürüyüşü",
    coverImage: "/media/so3/events/gomeda-vadisi-yuruyusu/cover.webp",
    gallery: [
      { src: "/media/so3/events/gomeda-vadisi-yuruyusu/gallery/01.webp", alt: "SO3 Gomeda Vadisi yürüyüşünden bir an", orientation: "portrait" },
      { src: "/media/so3/events/gomeda-vadisi-yuruyusu/gallery/02.webp", alt: "SO3 Gomeda Vadisi yürüyüşünden bir an", orientation: "portrait" },
      { src: "/media/so3/events/gomeda-vadisi-yuruyusu/gallery/03.webp", alt: "SO3 Gomeda Vadisi yürüyüşünden bir an", orientation: "portrait" },
      { src: "/media/so3/events/gomeda-vadisi-yuruyusu/gallery/04.webp", alt: "SO3 Gomeda Vadisi yürüyüşünden bir an", orientation: "portrait" },
      { src: "/media/so3/events/gomeda-vadisi-yuruyusu/gallery/05.webp", alt: "SO3 Gomeda Vadisi yürüyüşünden bir an", orientation: "portrait" },
      { src: "/media/so3/events/gomeda-vadisi-yuruyusu/gallery/06.webp", alt: "SO3 Gomeda Vadisi yürüyüşünden bir an", orientation: "portrait" },
      { src: "/media/so3/events/gomeda-vadisi-yuruyusu/gallery/07.webp", alt: "SO3 Gomeda Vadisi yürüyüşünden bir an", orientation: "portrait" }
    ],
    videos: [
      { src: "/media/so3/events/gomeda-vadisi-yuruyusu/video/01.mp4", poster: "/media/so3/events/gomeda-vadisi-yuruyusu/video/01-poster.webp", orientation: "portrait" }
    ],
    mediaStory: [
      { type: "image", index: 0 },
      { type: "image", index: 1 },
      { type: "video", index: 0 },
      { type: "image", index: 2 },
      { type: "image", index: 3 },
      { type: "image", index: 4 },
      { type: "image", index: 5 },
      { type: "image", index: 6 }
    ],
  },
  {
    id: "kirlangic-vadisi-yuruyusu",
    slug: "kirlangic-vadisi-yuruyusu",
    title: "Kırlangıç Vadisi Yürüyüşü",
    category: "doga-yuruyusu",
    categoryLabel: "Doğa Yürüyüşü",
    coverImage: "/media/so3/events/kirlangic-vadisi-yuruyusu/cover.webp",
    gallery: [
      { src: "/media/so3/events/kirlangic-vadisi-yuruyusu/gallery/01.webp", alt: "SO3 Kırlangıç Vadisi yürüyüşünden bir an", orientation: "portrait" },
      { src: "/media/so3/events/kirlangic-vadisi-yuruyusu/gallery/02.webp", alt: "SO3 Kırlangıç Vadisi yürüyüşünden bir an", orientation: "portrait" },
      { src: "/media/so3/events/kirlangic-vadisi-yuruyusu/gallery/03.webp", alt: "SO3 Kırlangıç Vadisi yürüyüşünden bir an", orientation: "portrait" },
      { src: "/media/so3/events/kirlangic-vadisi-yuruyusu/gallery/04.webp", alt: "SO3 Kırlangıç Vadisi yürüyüşünden bir an", orientation: "portrait" },
      { src: "/media/so3/events/kirlangic-vadisi-yuruyusu/gallery/05.webp", alt: "SO3 Kırlangıç Vadisi yürüyüşünden bir an", orientation: "portrait" },
      { src: "/media/so3/events/kirlangic-vadisi-yuruyusu/gallery/06.webp", alt: "SO3 Kırlangıç Vadisi yürüyüşünden bir an", orientation: "portrait" }
    ],
    videos: [],
    mediaStory: [
      { type: "image", index: 0 },
      { type: "image", index: 1 },
      { type: "image", index: 2 },
      { type: "image", index: 3 },
      { type: "image", index: 4 },
      { type: "image", index: 5 }
    ],
  },
  {
    id: "voleybol-etkinligi",
    slug: "voleybol-etkinligi",
    title: "Voleybol Etkinliği",
    category: "voleybol",
    categoryLabel: "Takımlı Oyunlar · Voleybol",
    coverImage: "/media/so3/events/voleybol-etkinligi/cover.webp",
    gallery: [
      { src: "/media/so3/events/voleybol-etkinligi/gallery/01.webp", alt: "SO3 voleybol etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/voleybol-etkinligi/gallery/02.webp", alt: "SO3 voleybol etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/voleybol-etkinligi/gallery/03.webp", alt: "SO3 voleybol etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/voleybol-etkinligi/gallery/04.webp", alt: "SO3 voleybol etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/voleybol-etkinligi/gallery/05.webp", alt: "SO3 voleybol etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/voleybol-etkinligi/gallery/06.webp", alt: "SO3 voleybol etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/voleybol-etkinligi/gallery/07.webp", alt: "SO3 voleybol etkinliğinden bir an", orientation: "portrait" }
    ],
    videos: [
      { src: "/media/so3/events/voleybol-etkinligi/video/01.mp4", poster: "/media/so3/events/voleybol-etkinligi/video/01-poster.webp", orientation: "portrait" }
    ],
    mediaStory: [
      { type: "image", index: 0 },
      { type: "video", index: 0 },
      { type: "image", index: 1 },
      { type: "image", index: 2 },
      { type: "image", index: 3 },
      { type: "image", index: 4 },
      { type: "image", index: 5 },
      { type: "image", index: 6 }
    ],
  },
  {
    id: "plaj-voleybolu",
    slug: "plaj-voleybolu",
    title: "Plaj Voleybolu",
    category: "voleybol",
    categoryLabel: "Takımlı Oyunlar · Voleybol",
    coverImage: "/media/so3/events/plaj-voleybolu/cover.webp",
    gallery: [
      { src: "/media/so3/events/plaj-voleybolu/gallery/01.webp", alt: "SO3 plaj voleybolu etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/plaj-voleybolu/gallery/02.webp", alt: "SO3 plaj voleybolu etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/plaj-voleybolu/gallery/03.webp", alt: "SO3 plaj voleybolu etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/plaj-voleybolu/gallery/04.webp", alt: "SO3 plaj voleybolu etkinliğinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/plaj-voleybolu/gallery/05.webp", alt: "SO3 plaj voleybolu etkinliğinden bir an", orientation: "portrait" }
    ],
    videos: [],
    mediaStory: [
      { type: "image", index: 0 },
      { type: "image", index: 1 },
      { type: "image", index: 2 },
      { type: "image", index: 3 },
      { type: "image", index: 4 }
    ],
  },
  {
    id: "mobilite-grup-dersi",
    slug: "mobilite-grup-dersi",
    title: "Mobilite Grup Dersi",
    category: "toplu-antrenman",
    categoryLabel: "Salon İçi Toplu Antrenman",
    coverImage: "/media/so3/events/mobilite-grup-dersi/cover.webp",
    gallery: [
      { src: "/media/so3/events/mobilite-grup-dersi/gallery/01.webp", alt: "SO3 mobilite grup dersinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/mobilite-grup-dersi/gallery/02.webp", alt: "SO3 mobilite grup dersinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/mobilite-grup-dersi/gallery/03.webp", alt: "SO3 mobilite grup dersinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/mobilite-grup-dersi/gallery/04.webp", alt: "SO3 mobilite grup dersinden bir an", orientation: "portrait" },
      { src: "/media/so3/events/mobilite-grup-dersi/gallery/05.webp", alt: "SO3 mobilite grup dersinden bir an", orientation: "portrait" }
    ],
    videos: [
      { src: "/media/so3/events/mobilite-grup-dersi/video/01.mp4", poster: "/media/so3/events/mobilite-grup-dersi/video/01-poster.webp", orientation: "portrait" }
    ],
    mediaStory: [
      { type: "image", index: 0 },
      { type: "image", index: 1 },
      { type: "video", index: 0 },
      { type: "image", index: 2 },
      { type: "image", index: 3 },
      { type: "image", index: 4 }
    ],
  }
];

export function getEventBySlug(slug: string): SO3Event | undefined {
  return EVENTS_DATA.find((e) => e.slug === slug);
}

export function getRelatedEvents(currentSlug: string, count = 3): SO3Event[] {
  const currentEvent = getEventBySlug(currentSlug);
  if (!currentEvent) return [];

  // Filter out current, try to pick different categories first
  const others = EVENTS_DATA.filter((e) => e.slug !== currentSlug);
  
  const differentCategory = others.filter(e => e.category !== currentEvent.category);
  const sameCategory = others.filter(e => e.category === currentEvent.category);
  
  const combined = [...differentCategory, ...sameCategory];
  return combined.slice(0, count);
}
