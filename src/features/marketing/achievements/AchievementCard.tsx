import { Link } from "react-router-dom";
import { HomeMediaPlaceholder } from "../home/HomeMediaPlaceholder";

export interface AchievementData {
  id: string;
  slug: string;
  title: string;
  athleteName: string;
  athleteImage?: string;
  coverImage?: string;
  competitionName: string;
  competitionDate: string;
  location?: string;
  category?: string;
  result?: string;
  description?: string;
  gallery?: string[];
  isFeatured?: boolean;
  status: 'draft' | 'published';
}

interface AchievementCardProps {
  achievement: AchievementData;
  detailsHref?: string;
}

export function AchievementCard({ achievement, detailsHref }: AchievementCardProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat("tr-TR", { 
        year: "numeric" 
      }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <article className="group flex flex-col bg-white border border-[#E5E3DB] rounded-lg overflow-hidden transition-all hover:border-[#0A0A0A]/20 hover:shadow-sm">
      <div className="relative h-56 sm:h-64 overflow-hidden bg-[#F4F1EB]">
        {achievement.coverImage ? (
          <img src={achievement.coverImage} alt={achievement.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <HomeMediaPlaceholder label="PERFORMANS" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
        
        {achievement.result && (
          <div className="absolute top-4 right-4">
            <span className="bg-[#851C35] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded shadow-sm">
              {achievement.result}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-center gap-3 mb-4 text-[#0A0A0A]/60 text-xs font-semibold uppercase tracking-wider">
          <span>{formatDate(achievement.competitionDate)}</span>
          <span className="w-1 h-1 rounded-full bg-[#0A0A0A]/20"></span>
          <span>{achievement.competitionName}</span>
        </div>
        
        <h3 className="text-xl font-bold text-[#0A0A0A] mb-1 leading-tight">
          {achievement.title}
        </h3>
        
        <p className="text-sm font-medium text-[#0A0A0A]/80 mb-3">
          {achievement.athleteName}
        </p>
        
        {achievement.description && (
          <p className="text-sm text-[#0A0A0A]/60 line-clamp-2 mb-6">
            {achievement.description}
          </p>
        )}
        
        {detailsHref && (
          <div className="mt-auto pt-6 border-t border-[#0A0A0A]/10">
            <Link 
              to={detailsHref}
              className="inline-flex items-center text-sm font-semibold text-[#851C35] group-hover:text-[#0A0A0A] transition-colors"
            >
              Detayları gör
              <span className="ml-1 transform transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
