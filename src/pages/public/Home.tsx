import { HomeHero } from "@/features/marketing/home/HomeHero";
import { HomeBrandBand } from "@/features/marketing/home/HomeBrandBand";
import { HomeDiscovery } from "@/features/marketing/home/HomeDiscovery";
import { HomeWhySO3 } from "@/features/marketing/home/HomeWhySO3";
import { HomeProcess } from "@/features/marketing/home/HomeProcess";
import { HomeBranches } from "@/features/marketing/home/HomeBranches";
import { HomeTrainers } from "@/features/marketing/home/HomeTrainers";
import { HomePerformance } from "@/features/marketing/home/HomePerformance";
import { HomeCommunity } from "@/features/marketing/home/HomeCommunity";
import { HomeTour } from "@/features/marketing/home/HomeTour";
import { HomeFinalCta } from "@/features/marketing/home/HomeFinalCta";

export function Home() {
  return (
    <div className="w-full flex-1">
      <HomeHero />
      <HomeBrandBand />
      <HomeDiscovery />
      <HomeWhySO3 />
      <HomeProcess />
      <HomeBranches />
      <HomeTrainers />
      <HomePerformance />
      <HomeCommunity />
      <HomeTour />
      <HomeFinalCta />
    </div>
  );
}
