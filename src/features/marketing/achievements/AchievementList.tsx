import { AchievementCard, AchievementData } from "./AchievementCard";
import { AchievementsEmptyState } from "./AchievementsEmptyState";

interface AchievementListProps {
  achievements: AchievementData[];
}

export function AchievementList({ achievements }: AchievementListProps) {
  const visibleAchievements = achievements.filter(a => a.status !== "draft");

  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-white text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        {visibleAchievements.length > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 border-b border-[#0A0A0A]/10 pb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Kayıtlar</h2>
          </div>
        )}

        {visibleAchievements.length === 0 ? (
          <AchievementsEmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleAchievements.map((achievement) => (
              <AchievementCard 
                key={achievement.id} 
                achievement={achievement} 
                detailsHref={undefined} 
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
