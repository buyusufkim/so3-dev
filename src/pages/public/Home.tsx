import { HeroSection } from "@/features/marketing/home/HeroSection";
import { SystemSection } from "@/features/marketing/home/SystemSection";
import { BranchesSection } from "@/features/marketing/home/BranchesSection";
import { TrainersSection } from "@/features/marketing/home/TrainersSection";
import { CommunitySection } from "@/features/marketing/home/CommunitySection";
import { PerformanceSection } from "@/features/marketing/home/PerformanceSection";
import { VirtualTourSection } from "@/features/marketing/home/VirtualTourSection";
import { CtaSection } from "@/features/marketing/home/CtaSection";

export function Home() {
  return (
    <div className="w-full flex-1">
      <HeroSection />
      <SystemSection />
      <BranchesSection />
      <TrainersSection />
      <CommunitySection />
      <PerformanceSection />
      <VirtualTourSection />
      <CtaSection />
    </div>
  );
}
