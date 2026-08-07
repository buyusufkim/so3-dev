import { AchievementsHero } from "../../features/marketing/achievements/AchievementsHero";
import { AchievementsIntro } from "../../features/marketing/achievements/AchievementsIntro";
import { AchievementList } from "../../features/marketing/achievements/AchievementList";
import { AchievementsProcess } from "../../features/marketing/achievements/AchievementsProcess";
import { AchievementsCta } from "../../features/marketing/achievements/AchievementsCta";
import { AchievementData } from "../../features/marketing/achievements/AchievementCard";

export function AchievementsPage() {
  // Geçici olarak boş başarı listesi kullanıyoruz.
  // Gerçek veri veya CMS entegrasyonu tamamlandığında bu alan gerçek verilerle doldurulacaktır.
  const achievements: AchievementData[] = [];

  return (
    <main className="w-full flex flex-col min-h-screen bg-white">
      <AchievementsHero />
      <AchievementsIntro />
      <AchievementList achievements={achievements} />
      <AchievementsProcess />
      <AchievementsCta />
    </main>
  );
}
