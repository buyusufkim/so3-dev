export interface PublicHeroBackground {
  url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
}

export interface PublicHeroContent {
  eyebrow: string;
  headline_primary: string;
  headline_emphasis: string;
  support_text: string;
  feature_left: string;
  feature_right: string;
  primary_cta_label: string;
  primary_cta_target: string;
  secondary_cta_label: string;
  secondary_cta_target: string;
  background: PublicHeroBackground | null;
}

export interface PublicBrandBandContent {
  items: string[];
}

export interface PublicAboutContent {
  eyebrow: string;
  headline_primary: string;
  headline_emphasis: string;
  paragraph_primary: string;
  paragraph_secondary: string;
  youtube_video_id: string;
  youtube_title: string;
}

export interface PublicWhySo3Item {
  title: string;
  description: string;
}

export interface PublicWhySo3Content {
  eyebrow: string;
  headline_primary: string;
  headline_emphasis: string;
  intro: string;
  items: PublicWhySo3Item[];
}

export interface PublicProcessStep {
  title: string;
}

export interface PublicProcessContent {
  eyebrow: string;
  headline_primary: string;
  headline_emphasis: string;
  steps: PublicProcessStep[];
}

export interface PublicHomepageContent {
  hero: PublicHeroContent;
  brand_band: PublicBrandBandContent;
  about: PublicAboutContent;
  why_so3: PublicWhySo3Content;
  process: PublicProcessContent;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isHeroBackground(value: unknown): value is PublicHeroBackground {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (typeof obj.url !== 'string' || obj.url === '') return false;
  
  if (obj.thumbnail_url !== null && typeof obj.thumbnail_url !== 'string') return false;
  if (obj.alt_text !== null && typeof obj.alt_text !== 'string') return false;
  
  return true;
}

export function isHeroContent(value: unknown): value is PublicHeroContent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.eyebrow)) return false;
  if (!isString(obj.headline_primary)) return false;
  if (!isString(obj.headline_emphasis)) return false;
  if (!isString(obj.support_text)) return false;
  if (!isString(obj.feature_left)) return false;
  if (!isString(obj.feature_right)) return false;
  if (!isString(obj.primary_cta_label)) return false;
  if (!isString(obj.primary_cta_target)) return false;
  if (!isString(obj.secondary_cta_label)) return false;
  if (!isString(obj.secondary_cta_target)) return false;
  
  if (obj.background !== null && !isHeroBackground(obj.background)) return false;
  
  return true;
}

export function isBrandBandContent(value: unknown): value is PublicBrandBandContent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (!Array.isArray(obj.items)) return false;
  if (!obj.items.every(isString)) return false;
  
  return true;
}

export function isAboutContent(value: unknown): value is PublicAboutContent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.eyebrow)) return false;
  if (!isString(obj.headline_primary)) return false;
  if (!isString(obj.headline_emphasis)) return false;
  if (!isString(obj.paragraph_primary)) return false;
  if (!isString(obj.paragraph_secondary)) return false;
  if (!isString(obj.youtube_video_id)) return false;
  if (!isString(obj.youtube_title)) return false;
  
  return true;
}

export function isWhySo3Content(value: unknown): value is PublicWhySo3Content {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.eyebrow)) return false;
  if (!isString(obj.headline_primary)) return false;
  if (!isString(obj.headline_emphasis)) return false;
  if (!isString(obj.intro)) return false;
  
  if (!Array.isArray(obj.items)) return false;
  for (const item of obj.items) {
    if (!item || typeof item !== 'object') return false;
    const itemObj = item as Record<string, unknown>;
    if (!isString(itemObj.title) || !isString(itemObj.description)) return false;
  }
  
  return true;
}

export function isProcessContent(value: unknown): value is PublicProcessContent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.eyebrow)) return false;
  if (!isString(obj.headline_primary)) return false;
  if (!isString(obj.headline_emphasis)) return false;
  
  if (!Array.isArray(obj.steps)) return false;
  for (const step of obj.steps) {
    if (!step || typeof step !== 'object') return false;
    const stepObj = step as Record<string, unknown>;
    if (!isString(stepObj.title)) return false;
  }
  
  return true;
}

export function parsePublicHomepageContentResponse(value: unknown): PublicHomepageContent {
  if (!value || typeof value !== 'object') {
    throw new Error('Malformed content payload: root is not an object');
  }
  const root = value as Record<string, unknown>;
  
  if (!root.data || typeof root.data !== 'object') {
    throw new Error('Malformed content payload: missing or invalid data object');
  }
  const data = root.data as Record<string, unknown>;
  
  if (!isHeroContent(data.hero)) throw new Error('Malformed content payload: hero');
  if (!isBrandBandContent(data.brand_band)) throw new Error('Malformed content payload: brand_band');
  if (!isAboutContent(data.about)) throw new Error('Malformed content payload: about');
  if (!isWhySo3Content(data.why_so3)) throw new Error('Malformed content payload: why_so3');
  if (!isProcessContent(data.process)) throw new Error('Malformed content payload: process');
  
  return {
    hero: data.hero,
    brand_band: data.brand_band,
    about: data.about,
    why_so3: data.why_so3,
    process: data.process
  };
}
