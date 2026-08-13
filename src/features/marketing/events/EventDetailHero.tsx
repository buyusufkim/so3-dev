import { Link } from "react-router-dom";

export function EventDetailHero({ event }: { event: any }) {
  const cover = event.cover?.url || event.cover_url || event.coverImage;
  const category = event.category?.name || event.category_name || 'Etkinlik';

  return (
    <section className="relative w-full">
      <div className="absolute inset-0 z-0 bg-brand-black">
        {cover ? (
          <img 
            src={cover} 
            alt={event.cover?.alt_text || event.title} 
            loading="eager" 
            fetchPriority="high"
            className="w-full h-full object-cover opacity-60" 
          />
        ) : (
          <div className="w-full h-full bg-[#0A0A0A] flex items-center justify-center opacity-60">
            <span className="text-[#F4F1EB]/5 text-9xl font-black tracking-tighter">SO3</span>
          </div>
        )}
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent z-10"></div>
      
      <div className="relative z-20 container mx-auto px-6 lg:px-12 pt-32 pb-24 md:pt-48 md:pb-32 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/50 mb-8 md:mb-12">
          <Link to="/" className="hover:text-white transition-colors">Ana Sayfa</Link>
          <span>/</span>
          <Link to="/etkinlikler" className="hover:text-white transition-colors">Etkinlikler</Link>
        </div>
        
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/70">
            {category}
          </span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.05] text-white max-w-4xl mb-8 md:mb-12">
          {event.title}
        </h1>
        
        <p className="text-sm md:text-base text-white/60 font-medium max-w-xl mx-auto leading-relaxed">
          SO3 topluluğuyla salon dışında da birlikte hareket ediyoruz.
        </p>
      </div>
    </section>
  );
}
