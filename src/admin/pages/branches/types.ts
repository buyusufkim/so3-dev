export interface BranchMedia {
  id: number;
  url: string;
  thumbnail_url?: string | null;
  alt_text?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface AdminBranchListItem {
  id: number;
  uuid: string;
  slug: string;
  name: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  updated_at: string | null;
  cover: BranchMedia | null;
  gallery_count: number | string;
}

export interface AdminBranchDetail {
  id: number;
  uuid: string;
  slug: string;
  name: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  cover: BranchMedia | null;
  gallery: BranchMedia[];
}
