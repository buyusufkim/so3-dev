import { Link } from "react-router-dom";
import { SO3Event } from "./events.data";

interface EventCardProps {
  event: SO3Event;
  className?: string;
  isLarge?: boolean;
}

export function EventCard({ event, className = "", isLarge = false }: EventCardProps) {
  return (
    <Link 
      to={`/etkinlikler/${event.slug}`}
      className={`group relative flex flex-col overflow-hidden bg-brand-black rounded-md ${className}`}
    >
      <div className="absolute inset-0 z-0">
        {event.coverImage ? (
          <img 
            src={event.coverImage} 
            alt={event.title} 
            loading="lazy" 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
            <span className="text-[#F4F1EB]/10 text-6xl font-black tracking-tighter">SO3</span>
          </div>
        )}
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent z-10 opacity-90 group-hover:opacity-100 transition-opacity"></div>
      
      <div className={`relative z-20 flex flex-col justify-end w-full h-full ${isLarge ? 'p-8 md:p-12' : 'p-6'}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="w-1 h-1 rounded-full bg-[#851C35]"></span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
            {event.categoryLabel}
          </span>
        </div>
        
        <h3 className={`${isLarge ? 'text-3xl md:text-5xl mb-4' : 'text-2xl mb-3'} font-bold tracking-tight text-white`}>
          {event.title}
        </h3>
        
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">
          <span>Etkinliği Keşfet</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-1 transition-transform">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </div>
      </div>
    </Link>
  );
}
