export interface PublicBranchMedia {
  url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
  caption?: string | null;
}

export interface PublicBranch {
  slug: string;
  name: string;
  description: string;
  cover: PublicBranchMedia | null;
  gallery: PublicBranchMedia[];
}
