import { Link } from "react-router-dom";
import { HomeMediaPlaceholder } from "../home/HomeMediaPlaceholder";

export interface EventData {
  id: string;
  slug: string;
  title: string;
  shortDescription?: string;
  coverImage?: string;
  eventType: string;
  startDate: string;
  endDate?: string;
  locationName: string;
  locationAddress?: string;
  capacity?: number;
  registrationDeadline?: string;
  status: 'draft' | 'published' | 'registration_open' | 'registration_closed' | 'completed' | 'cancelled';
  isMembersOnly?: boolean;
  registrationEnabled?: boolean;
}

interface EventCardProps {
  event: EventData;
  detailsHref?: string;
}

export function EventCard({ event, detailsHref }: EventCardProps) {
  const getStatusLabel = (status: EventData['status']) => {
    switch (status) {
      case 'registration_open': return 'Kayıt Açık';
      case 'registration_closed': return 'Kayıt Kapandı';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return null;
    }
  };

  const statusLabel = getStatusLabel(event.status);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat("tr-TR", { 
        day: "numeric", 
        month: "long", 
        year: "numeric" 
      }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <article className="group flex flex-col bg-white border border-[#E5E3DB] rounded-lg overflow-hidden transition-all hover:border-[#0A0A0A]/20 hover:shadow-sm">
      <div className="relative h-48 sm:h-56 overflow-hidden bg-[#F4F1EB]">
        {event.coverImage ? (
          <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <HomeMediaPlaceholder label="ETKİNLİK GÖRSELİ" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
        <div className="absolute top-4 left-4 flex gap-2">
          {event.isMembersOnly && (
            <span className="bg-[#0A0A0A] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">
              Üyelere Özel
            </span>
          )}
          {statusLabel && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-white text-[#0A0A0A]">
              {statusLabel}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-center gap-3 mb-4 text-[#0A0A0A]/60 text-xs font-semibold uppercase tracking-wider">
          <span>{formatDate(event.startDate)}</span>
          <span className="w-1 h-1 rounded-full bg-[#0A0A0A]/20"></span>
          <span>{event.locationName}</span>
        </div>
        
        <h3 className="text-xl font-bold text-[#0A0A0A] mb-2 leading-tight">
          {event.title}
        </h3>
        
        {event.shortDescription && (
          <p className="text-sm text-[#0A0A0A]/60 line-clamp-2 mb-6">
            {event.shortDescription}
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
