import { TrainersHero } from "../../features/marketing/trainers/TrainersHero";
import { TrainersIntro } from "../../features/marketing/trainers/TrainersIntro";
import { TrainerDirectory } from "../../features/marketing/trainers/TrainerDirectory";
import { TrainerApproach } from "../../features/marketing/trainers/TrainerApproach";
import { TrainerBranches } from "../../features/marketing/trainers/TrainerBranches";
import { TrainersCta } from "../../features/marketing/trainers/TrainersCta";

export function TrainersPage() {
  return (
    <main className="w-full flex flex-col min-h-screen bg-[#050505]">
      <TrainersHero />
      <TrainersIntro />
      <TrainerDirectory />
      <TrainerApproach />
      <TrainerBranches />
      <TrainersCta />
    </main>
  );
}
