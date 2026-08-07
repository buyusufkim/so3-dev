export function ContactInfo() {
  return (
    <div className="flex flex-col gap-8 pb-10 border-b border-[#0A0A0A]/10">
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-bold text-[#0A0A0A]">Konum</h3>
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#0A0A0A]/5 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#0A0A0A]/50 uppercase tracking-wider mb-0.5">Konum</span>
            <span className="text-sm font-bold text-[#0A0A0A]">Kayseri, Türkiye</span>
          </div>
        </div>
      </div>
    </div>
  );
}
