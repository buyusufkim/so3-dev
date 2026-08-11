export function HomeInstagram() {
  return (
    <section id="instagram" className="py-16 md:py-24 bg-white text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 bg-[#F4F1EB] rounded-lg border border-[#E5E3DB] p-8 md:p-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
                SO3 / INSTAGRAM
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight mb-4">
              SO3'ü <span className="font-bold">takip et.</span>
            </h2>
            <p className="text-base md:text-lg text-[#0A0A0A]/70 font-medium">
              Antrenmanlar, eğitmenler ve SO3 topluluğundan güncel anlar için @so3pt.
            </p>
          </div>

          <div className="shrink-0 w-full md:w-auto mt-4 md:mt-0">
            <a 
              href="https://www.instagram.com/so3pt/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center justify-center bg-[#0A0A0A] text-white px-8 py-4 rounded text-sm font-semibold hover:bg-[#851C35] transition-colors w-full md:w-auto"
              aria-label="SO3 PT Instagram"
            >
              <span className="mr-3">@so3pt</span>
              <span className="transform transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>
        
        {/* 
          TODO: Real Instagram Professional API datasource will replace empty state 
          after server-side credentials are configured.
        */}
      </div>
    </section>
  );
}
