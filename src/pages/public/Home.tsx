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

export function Home() {
  return (
    <div className="w-full flex-1">
      <PageSEO 
        title="SO3 Personal Training | Kayseri" 
        description="Kayseri'de kişiye özel antrenman, birebir dersler, fitness, yoga, pilates, boks ve uzman diyetisyen desteği. SO3 Personal Training ile hedeflerine göre şekillenen kişisel bir antrenman deneyimi."
        canonical="https://so3pt.com.tr/"
        ogType="website"
      />
      <HomeHero />
      <HomeBrandBand />
      <HomeBranches />
      <HomeAbout />
      <HomeWhySO3 />
      <HomeProcess />
      <HomeTrainers />
      <HomePerformance />
      <HomeCommunity />
      <HomeInstagram />
      <HomeTour />
      <HomeContact />
    </div>
  );
}
