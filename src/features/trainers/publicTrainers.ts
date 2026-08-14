export interface PublicTrainerProfile {
  url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
}

export interface PublicTrainerBranch {
  slug: string;
  name: string;
}

export interface PublicTrainer {
  slug: string;
  name: string;
  role_title: string;
  bio: string | null;
  instagram_username: string | null;
  branch: PublicTrainerBranch;
  profile: PublicTrainerProfile | null;
}

export function isPublicTrainerProfile(value: unknown): value is PublicTrainerProfile {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (typeof obj.url !== 'string' || obj.url.trim() === '') return false;
  if (obj.thumbnail_url !== null && typeof obj.thumbnail_url !== 'string') return false;
  if (obj.alt_text !== null && typeof obj.alt_text !== 'string') return false;
  
  return true;
}

export function isPublicTrainerBranch(value: unknown): value is PublicTrainerBranch {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (typeof obj.slug !== 'string' || obj.slug.trim() === '') return false;
  if (typeof obj.name !== 'string' || obj.name.trim() === '') return false;
  
  return true;
}

export function isPublicTrainer(value: unknown): value is PublicTrainer {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (typeof obj.slug !== 'string' || obj.slug.trim() === '') return false;
  if (typeof obj.name !== 'string' || obj.name.trim() === '') return false;
  if (typeof obj.role_title !== 'string' || obj.role_title.trim() === '') return false;
  
  if (obj.bio !== null && typeof obj.bio !== 'string') return false;
  if (obj.instagram_username !== null && typeof obj.instagram_username !== 'string') return false;
  
  if (!isPublicTrainerBranch(obj.branch)) return false;
  if (obj.profile !== null && !isPublicTrainerProfile(obj.profile)) return false;
  
  return true;
}

export function parsePublicTrainersResponse(value: unknown): PublicTrainer[] {
  if (!value || typeof value !== 'object') {
    throw new Error('Malformed payload: root is not an object');
  }
  const obj = value as Record<string, unknown>;
  if (!('data' in obj) || !Array.isArray(obj.data)) {
    throw new Error('Malformed payload: data is missing or not an array');
  }
  
  const trainers: PublicTrainer[] = [];
  for (const item of obj.data) {
    if (!isPublicTrainer(item)) {
      throw new Error('Malformed payload: invalid trainer item');
    }
    trainers.push(item);
  }
  
  return trainers;
}
