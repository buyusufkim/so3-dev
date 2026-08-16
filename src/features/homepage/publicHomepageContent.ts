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

export interface PublicPerformanceContent {
  headline_primary: string;
  headline_emphasis: string;
  description: string;
  background: PublicHeroBackground | null;
}

export interface PublicBranchesSectionContent {
  eyebrow: string;
  headline_primary: string;
  headline_emphasis: string;
  gallery_cta_label: string;
}

export interface PublicTrainersSectionContent {
  eyebrow: string;
  headline: string;
  intro: string;
}

export interface PublicCommunitySectionContent {
  eyebrow: string;
  headline: string;
  intro: string;
  cta_label: string;
}

export interface PublicInstagramSectionContent {
  eyebrow: string;
  headline: string;
  intro: string;
  cta_label: string;
  placeholder_text: string;
  reels?: string[];
}

export interface PublicTourSectionContent {
  eyebrow: string;
  headline: string;
  intro: string;
}

export interface PublicContactSectionContent {
  contact_eyebrow: string;
  contact_headline_primary: string;
  contact_headline_emphasis: string;
  directions_cta_label: string;
  consultation_eyebrow: string;
  consultation_headline_primary: string;
  consultation_headline_emphasis: string;
  consultation_intro_primary: string;
  consultation_intro_secondary: string;
}

export type ParsedPublicHomepageContent = {
  [K in keyof PublicHomepageContent]: PublicHomepageContent[K] | null;
};

export interface PublicHomepageContent {
  hero: PublicHeroContent;
  brand_band: PublicBrandBandContent;
  about: PublicAboutContent;
  why_so3: PublicWhySo3Content;
  process: PublicProcessContent;
  performance: PublicPerformanceContent;
  branches: PublicBranchesSectionContent;
  trainers: PublicTrainersSectionContent;
  community: PublicCommunitySectionContent;
  instagram: PublicInstagramSectionContent;
  tour: PublicTourSectionContent;
  contact: PublicContactSectionContent;
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

export function isPerformanceContent(value: unknown): value is PublicPerformanceContent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.headline_primary)) return false;
  if (!isString(obj.headline_emphasis)) return false;
  if (!isString(obj.description)) return false;
  
  if (obj.background !== null && !isHeroBackground(obj.background)) return false;
  
  return true;
}

export function isBranchesSectionContent(value: unknown): value is PublicBranchesSectionContent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.eyebrow)) return false;
  if (!isString(obj.headline_primary)) return false;
  if (!isString(obj.headline_emphasis)) return false;
  if (!isString(obj.gallery_cta_label)) return false;
  
  return true;
}

export function isTrainersSectionContent(value: unknown): value is PublicTrainersSectionContent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.eyebrow)) return false;
  if (!isString(obj.headline)) return false;
  if (!isString(obj.intro)) return false;
  
  return true;
}

export function isCommunitySectionContent(value: unknown): value is PublicCommunitySectionContent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.eyebrow)) return false;
  if (!isString(obj.headline)) return false;
  if (!isString(obj.intro)) return false;
  if (!isString(obj.cta_label)) return false;
  
  return true;
}

export function isInstagramSectionContent(value: unknown): value is PublicInstagramSectionContent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.eyebrow)) return false;
  if (!isString(obj.headline)) return false;
  if (!isString(obj.intro)) return false;
  if (!isString(obj.cta_label)) return false;
  if (!isString(obj.placeholder_text)) return false;

  if (obj.reels !== undefined) {
    if (!Array.isArray(obj.reels)) return false;
    if (obj.reels.length > 6) return false;
    for (const reel of obj.reels) {
      if (!isString(reel)) return false;
    }
  }

  return true;
}

export function isTourSectionContent(value: unknown): value is PublicTourSectionContent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.eyebrow)) return false;
  if (!isString(obj.headline)) return false;
  if (!isString(obj.intro)) return false;
  
  return true;
}

export function isContactSectionContent(value: unknown): value is PublicContactSectionContent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  
  if (!isString(obj.contact_eyebrow)) return false;
  if (!isString(obj.contact_headline_primary)) return false;
  if (!isString(obj.contact_headline_emphasis)) return false;
  if (!isString(obj.directions_cta_label)) return false;
  if (!isString(obj.consultation_eyebrow)) return false;
  if (!isString(obj.consultation_headline_primary)) return false;
  if (!isString(obj.consultation_headline_emphasis)) return false;
  if (!isString(obj.consultation_intro_primary)) return false;
  if (!isString(obj.consultation_intro_secondary)) return false;
  
  return true;
}

export function parsePublicHomepageContentResponse(value: unknown): ParsedPublicHomepageContent {
  if (!value || typeof value !== 'object') {
    throw new Error('Malformed content payload: root is not an object');
  }
  const root = value as Record<string, unknown>;
  
  if (!root.data || typeof root.data !== 'object') {
    throw new Error('Malformed content payload: missing or invalid data object');
  }
  const data = root.data as Record<string, unknown>;
  
  return {
    hero: isHeroContent(data.hero) ? data.hero : null,
    brand_band: isBrandBandContent(data.brand_band) ? data.brand_band : null,
    about: isAboutContent(data.about) ? data.about : null,
    why_so3: isWhySo3Content(data.why_so3) ? data.why_so3 : null,
    process: isProcessContent(data.process) ? data.process : null,
    performance: isPerformanceContent(data.performance) ? data.performance : null,
    branches: isBranchesSectionContent(data.branches) ? data.branches : null,
    trainers: isTrainersSectionContent(data.trainers) ? data.trainers : null,
    community: isCommunitySectionContent(data.community) ? data.community : null,
    instagram: isInstagramSectionContent(data.instagram) ? data.instagram : null,
    tour: isTourSectionContent(data.tour) ? data.tour : null,
    contact: isContactSectionContent(data.contact) ? data.contact : null
  };
}
