import { useState, useEffect } from "react";
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

const SECTION_COMPONENTS: Record<HomepageSectionId, React.ComponentType> = {
  hero: HomeHero,
  brand_band: HomeBrandBand,
  branches: HomeBranches,
  about: HomeAbout,
  why_so3: HomeWhySO3,
  process: HomeProcess,
  trainers: HomeTrainers,
  performance: HomePerformance,
  community: HomeCommunity,
  instagram: HomeInstagram,
  tour: HomeTour,
  contact: HomeContact
};

export function Home() {
  const [sections, setSections] = useState<HomepageSectionId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchStructure() {
      try {
        setLoading(true);
        const res = await fetch("/api/public/homepage");
        if (!res.ok) throw new Error("Failed to fetch homepage structure");
        
        const json: unknown = await res.json();
        const parsed = parsePublicHomepageResponse(json);
        
        if (mounted) {
          setSections(parsed.map(s => s.section_id));
        }
      } catch (err) {
        if (mounted) {
          setSections(DEFAULT_HOME_SECTION_ORDER);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchStructure();
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
        const Component = SECTION_COMPONENTS[sectionId];
        return <Component key={sectionId} />;
      })}
    </div>
  );
}
