import { Link } from "react-router-dom";

export function AchievementsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-[#F4F1EB] rounded-lg border border-[#E5E3DB]">
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0A0A0A]/5 mb-6">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
          <path d="M12 15l-3-3m0 0l3-3m-3 3h8M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-[#0A0A0A] mb-3">Başarı hikâyeleri burada yer alacak.</h3>
      <p className="text-sm md:text-base text-[#0A0A0A]/60 max-w-md mx-auto mb-8 leading-relaxed">
        Doğrulanmış yarışma ve performans hikâyeleri bu alanda paylaşılacak.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link 
          to="/egitmenler"
          className="inline-flex items-center justify-center bg-[#0A0A0A] text-white px-6 py-4 rounded text-sm font-semibold hover:bg-[#851C35] transition-colors"
        >
          Eğitmenleri keşfet
        </Link>
        <Link 
          to="/branslar"
          className="inline-flex items-center justify-center bg-transparent border border-[#0A0A0A]/20 text-[#0A0A0A] px-6 py-4 rounded text-sm font-semibold hover:bg-black/5 transition-colors"
        >
          Branşları keşfet
        </Link>
      </div>
    </div>
  );
}
