import { Link } from "react-router-dom";

export function CommunityEventsLink() {
  return (
    <section className="py-20 md:py-24 px-4 sm:px-6 lg:px-12 bg-white text-[#0A0A0A] border-t border-[#0A0A0A]/10">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
          Yaklaşan buluşmalar
        </h2>
        <p className="text-base text-[#0A0A0A]/60 leading-relaxed mb-8 max-w-2xl mx-auto">
          SO3 etkinliklerini ve duyurularını Etkinlikler sayfasından takip edebilirsin.
        </p>
        
        <Link 
           to="/etkinlikler" 
           className="inline-flex items-center justify-center bg-transparent border border-[#0A0A0A]/20 text-[#0A0A0A] px-8 py-4 rounded text-sm font-semibold hover:bg-black/5 transition-colors group"
        >
          <span>Etkinlikleri keşfet</span>
          <span className="ml-3 transform transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </section>
  );
}
