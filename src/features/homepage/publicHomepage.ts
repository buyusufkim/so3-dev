export type { HomepageSectionId } from './homepageSections';
export { isHomepageSectionId, HOMEPAGE_SECTION_IDS, DEFAULT_HOME_SECTION_ORDER } from './homepageSections';
import { HomepageSectionId, isHomepageSectionId } from './homepageSections';

export interface PublicHomepageSection {
  section_id: HomepageSectionId;
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


