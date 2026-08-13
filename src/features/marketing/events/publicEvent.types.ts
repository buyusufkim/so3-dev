export interface PublicEventMedia {
  id: number;
  media_type: 'image' | 'video';
  url: string;
  thumbnail_url?: string | null;
  alt_text?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface PublicEventDetail {
  id: number | string;
  slug: string;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  event_date?: string | null;
  location?: string | null;

  category?: {
    name: string;
    slug: string;
  };

  cover?: {
    id?: number;
    url: string;
    thumbnail_url?: string | null;
    alt_text?: string | null;
  } | null;

  gallery: PublicEventMedia[];

  seo_title?: string | null;
  seo_description?: string | null;
  published_at?: string | null;
}
