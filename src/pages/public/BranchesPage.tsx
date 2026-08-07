import { BranchesHero } from "../../features/marketing/branches/BranchesHero";
import { BranchJumpNav } from "../../features/marketing/branches/BranchJumpNav";
import { FitnessSection } from "../../features/marketing/branches/FitnessSection";
import { YogaPilatesSection } from "../../features/marketing/branches/YogaPilatesSection";
import { BoxingSection } from "../../features/marketing/branches/BoxingSection";
import { BranchesApproach } from "../../features/marketing/branches/BranchesApproach";
import { BranchesCta } from "../../features/marketing/branches/BranchesCta";

export function BranchesPage() {
  return (
    <main className="w-full flex flex-col min-h-screen bg-[#050505]">
      <BranchesHero />
      <BranchJumpNav />
      <FitnessSection />
      <YogaPilatesSection />
      <BoxingSection />
      <BranchesApproach />
      <BranchesCta />
    </main>
  );
}
