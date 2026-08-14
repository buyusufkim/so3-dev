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


export function isPublicBranchMedia(value: unknown): value is PublicBranchMedia {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (typeof obj.url !== 'string' || obj.url.trim() === '') return false;
  if (obj.thumbnail_url !== null && typeof obj.thumbnail_url !== 'string') return false;
  if (obj.alt_text !== null && typeof obj.alt_text !== 'string') return false;
  if (obj.caption !== undefined && obj.caption !== null && typeof obj.caption !== 'string') return false;
  
  return true;
}

export function isPublicBranch(value: unknown): value is PublicBranch {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (typeof obj.slug !== 'string' || obj.slug.trim() === '') return false;
  if (typeof obj.name !== 'string') return false;
  if (typeof obj.description !== 'string') return false;
  
  if (obj.cover !== null && !isPublicBranchMedia(obj.cover)) return false;
  
  if (!Array.isArray(obj.gallery)) return false;
  for (const item of obj.gallery) {
    if (!isPublicBranchMedia(item)) return false;
  }
  
  return true;
}

export function parsePublicBranchesResponse(value: unknown): PublicBranch[] {
  if (!value || typeof value !== 'object') {
    throw new Error('Malformed payload: root is not an object');
  }
  const obj = value as Record<string, unknown>;
  if (!('data' in obj) || !Array.isArray(obj.data)) {
    throw new Error('Malformed payload: data is missing or not an array');
  }
  
  const branches: PublicBranch[] = [];
  for (const item of obj.data) {
    if (!isPublicBranch(item)) {
      throw new Error('Malformed payload: invalid branch item');
    }
    branches.push(item);
  }
  
  return branches;
}
