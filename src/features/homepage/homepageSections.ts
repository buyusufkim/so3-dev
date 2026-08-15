export const HOMEPAGE_SECTION_IDS = [
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
] as const;

export type HomepageSectionId = typeof HOMEPAGE_SECTION_IDS[number];

export const isHomepageSectionId = (value: string): value is HomepageSectionId => {
  return (HOMEPAGE_SECTION_IDS as readonly string[]).includes(value);
};

export const DEFAULT_HOME_SECTION_ORDER: HomepageSectionId[] = [...HOMEPAGE_SECTION_IDS];
