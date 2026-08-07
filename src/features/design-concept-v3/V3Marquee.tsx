export function V3Marquee() {
  return (
    <div className="bg-[#09090B] py-6 overflow-hidden border-b border-white/10">
      <div className="flex whitespace-nowrap opacity-50">
        {/* We use two containers for the infinite scroll illusion */}
        <div className="animate-[marquee_20s_linear_infinite] flex items-center">
          <span className="text-sm md:text-base font-semibold uppercase tracking-[0.2em] text-white mx-8">
            KİŞİYE ÖZEL ANTRENMAN
          </span>
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          <span className="text-sm md:text-base font-semibold uppercase tracking-[0.2em] text-white mx-8">
            BİREBİR TAKİP
          </span>
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          <span className="text-sm md:text-base font-semibold uppercase tracking-[0.2em] text-white mx-8">
            SO3 PT
          </span>
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          <span className="text-sm md:text-base font-semibold uppercase tracking-[0.2em] text-white mx-8">
            PERFORMANS KÜLTÜRÜ
          </span>
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
        </div>
        
        <div className="animate-[marquee_20s_linear_infinite] flex items-center" aria-hidden="true">
          <span className="text-sm md:text-base font-semibold uppercase tracking-[0.2em] text-white mx-8">
            KİŞİYE ÖZEL ANTRENMAN
          </span>
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          <span className="text-sm md:text-base font-semibold uppercase tracking-[0.2em] text-white mx-8">
            BİREBİR TAKİP
          </span>
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          <span className="text-sm md:text-base font-semibold uppercase tracking-[0.2em] text-white mx-8">
            SO3 PT
          </span>
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          <span className="text-sm md:text-base font-semibold uppercase tracking-[0.2em] text-white mx-8">
            PERFORMANS KÜLTÜRÜ
          </span>
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
        </div>
      </div>
    </div>
  );
}
