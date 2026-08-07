import { Link } from "react-router-dom";

export function EventsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-[#F4F1EB] rounded-lg border border-[#E5E3DB]">
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0A0A0A]/5 mb-6">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-[#0A0A0A] mb-3">Yeni etkinlikler burada yayınlanacak.</h3>
      <p className="text-sm md:text-base text-[#0A0A0A]/60 max-w-md mx-auto mb-8 leading-relaxed">
        SO3 etkinlikleri ve buluşmaları duyurulduğunda bu sayfadan takip edebilirsin.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link 
          to="/topluluk"
          className="inline-flex items-center justify-center bg-[#0A0A0A] text-white px-6 py-4 rounded text-sm font-semibold hover:bg-[#851C35] transition-colors"
        >
          Topluluğu keşfet
        </Link>
        <Link 
          to="/iletisim"
          className="inline-flex items-center justify-center bg-transparent border border-[#0A0A0A]/20 text-[#0A0A0A] px-6 py-4 rounded text-sm font-semibold hover:bg-black/5 transition-colors"
        >
          Ön görüşme planla
        </Link>
      </div>
    </div>
  );
}
