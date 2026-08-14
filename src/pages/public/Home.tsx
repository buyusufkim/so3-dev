import React, { useState, useEffect } from "react";
import { HomeHero } from "@/features/marketing/home/HomeHero";
import { HomeBrandBand } from "@/features/marketing/home/HomeBrandBand";
import { HomeAbout } from "@/features/marketing/home/HomeAbout";
import { HomeWhySO3 } from "@/features/marketing/home/HomeWhySO3";
import { HomeProcess } from "@/features/marketing/home/HomeProcess";
import { HomeBranches } from "@/features/marketing/home/HomeBranches";
import { HomeTrainers } from "@/features/marketing/home/HomeTrainers";
import { HomePerformance } from "@/features/marketing/home/HomePerformance";
import { HomeCommunity } from "@/features/marketing/home/HomeCommunity";
import { HomeInstagram } from "@/features/marketing/home/HomeInstagram";
import { HomeTour } from "@/features/marketing/home/HomeTour";
import { HomeContact } from "@/features/marketing/home/HomeContact";
import { PageSEO } from "@/components/seo/PageSEO";
import { 
  type HomepageSectionId, 
  parsePublicHomepageResponse, 
  DEFAULT_HOME_SECTION_ORDER 
} from "@/features/homepage/publicHomepage";
import {
  type PublicHomepageContent,
  parsePublicHomepageContentResponse
} from "@/features/homepage/publicHomepageContent";

type SectionRenderer = (content: PublicHomepageContent | null) => React.ReactNode;

const SECTION_RENDERERS: Record<HomepageSectionId, SectionRenderer> = {
  hero: (content) => content ? <HomeHero content={content.hero} /> : null,
  brand_band: (content) => content ? <HomeBrandBand content={content.brand_band} /> : null,
  branches: (content) => content ? <HomeBranches content={content.branches} /> : null,
  about: (content) => content ? <HomeAbout content={content.about} /> : null,
  why_so3: (content) => content ? <HomeWhySO3 content={content.why_so3} /> : null,
  process: (content) => content ? <HomeProcess content={content.process} /> : null,
  trainers: () => <HomeTrainers />,
  performance: (content) => content ? <HomePerformance content={content.performance} /> : null,
  community: () => <HomeCommunity />,
  instagram: () => <HomeInstagram />,
  tour: () => <HomeTour />,
  contact: () => <HomeContact />
};

export function Home() {
  const [sections, setSections] = useState<HomepageSectionId[]>([]);
  const [content, setContent] = useState<PublicHomepageContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);

        const [structureRes, contentRes] = await Promise.all([
          fetch("/api/public/homepage").catch(() => null),
          fetch("/api/public/homepage/content").catch(() => null)
        ]);

        let parsedStructure = DEFAULT_HOME_SECTION_ORDER;
        if (structureRes && structureRes.ok) {
          try {
            const structureJson = await structureRes.json();
            parsedStructure = parsePublicHomepageResponse(structureJson).map(s => s.section_id);
          } catch (err) {
            // structure error, keep default
          }
        }

        let parsedContent: PublicHomepageContent | null = null;
        if (contentRes && contentRes.ok) {
          try {
            const contentJson = await contentRes.json();
            parsedContent = parsePublicHomepageContentResponse(contentJson);
          } catch (err) {
            // content error, keep null
          }
        }

        if (mounted) {
          setSections(parsedStructure);
          setContent(parsedContent);
        }
      } catch (err) {
        if (mounted) {
          setSections(DEFAULT_HOME_SECTION_ORDER);
          setContent(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();

    return () => { mounted = false; };
  }, []);

  return (
    <div className="w-full flex-1">
      <PageSEO 
        title="SO3 Personal Training | Kayseri" 
        description="Kayseri'de kişiye özel antrenman, birebir dersler, fitness, yoga, pilates, boks ve uzman diyetisyen desteği. SO3 Personal Training ile hedeflerine göre şekillenen kişisel bir antrenman deneyimi."
        canonical="https://so3pt.com.tr/"
        ogType="website"
      />
      
      {!loading && sections.map((sectionId) => {
        const renderSection = SECTION_RENDERERS[sectionId];
        return <React.Fragment key={sectionId}>{renderSection(content)}</React.Fragment>;
      })}
    </div>
  );
}
