export type HomepageSectionId =
  | 'hero'
  | 'brand_band'
  | 'branches'
  | 'about'
  | 'why_so3'
  | 'process'
  | 'trainers'
  | 'performance'
  | 'community'
  | 'instagram'
  | 'tour'
  | 'contact';

export interface PublicHomepageSection {
  section_id: HomepageSectionId;
}

export function isHomepageSectionId(value: unknown): value is HomepageSectionId {
  return typeof value === 'string' && [
    'hero',
    'brand_band',
    'branches',
    'about',
    'why_so3',
    'process',
    'trainers',
    'performance',
    'community',
    'instagram',
    'tour',
    'contact'
  ].includes(value);
}

export function parsePublicHomepageResponse(value: unknown): PublicHomepageSection[] {
  if (!value || typeof value !== 'object') {
    throw new Error('Malformed payload: root is not an object');
  }
  
  const obj = value as Record<string, unknown>;
  
  if (!('data' in obj) || !Array.isArray(obj.data)) {
    throw new Error('Malformed payload: data is missing or not an array');
  }
  
  const sections: PublicHomepageSection[] = [];
  const seenIds = new Set<string>();
  
  for (const item of obj.data) {
    if (!item || typeof item !== 'object') {
      throw new Error('Malformed payload: section item is not an object');
    }
    
    const sectionObj = item as Record<string, unknown>;
    
    if (!isHomepageSectionId(sectionObj.section_id)) {
      throw new Error(`Malformed payload: invalid or unknown section_id ${String(sectionObj.section_id)}`);
    }
    
    if (seenIds.has(sectionObj.section_id)) {
      throw new Error(`Malformed payload: duplicate section_id ${sectionObj.section_id}`);
    }
    
    seenIds.add(sectionObj.section_id);
    sections.push({ section_id: sectionObj.section_id });
  }
  
  return sections;
}

export const DEFAULT_HOME_SECTION_ORDER: HomepageSectionId[] = [
  'hero',
  'brand_band',
  'branches',
  'about',
  'why_so3',
  'process',
  'trainers',
  'performance',
  'community',
  'instagram',
  'tour',
  'contact'
];
