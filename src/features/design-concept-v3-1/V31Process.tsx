export function V31Process() {
  const processSteps = [
    { num: "01", title: "Seni tanırız." },
    { num: "02", title: "Sana göre planlarız." },
    { num: "03", title: "Birlikte çalışırız." },
    { num: "04", title: "Sen geliştikçe süreci güncelleriz." }
  ];

  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#121212] text-white">
      <div className="container mx-auto max-w-7xl">
        
        <div className="mb-16 md:mb-24">
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50">
              NASIL ÇALIŞIR?
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-tight max-w-2xl">
            Net bir süreç.<br />
            <span className="font-bold">Sana göre ilerler.</span>
          </h2>
        </div>

        {/* Desktop Horizontal Process */}
        <div className="hidden lg:grid grid-cols-4 gap-6 relative">
          {/* Connecting Line */}
          <div className="absolute top-[32px] left-8 right-8 h-px bg-white/10 z-0"></div>
          
          {processSteps.map((step, idx) => (
            <div key={idx} className="relative z-10 flex flex-col group">
              <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center mb-8 group-hover:border-[#851C35] group-hover:bg-[#851C35]/10 transition-colors">
                <span className="text-lg font-bold text-white/80 group-hover:text-[#851C35] transition-colors">{step.num}</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight pr-4">
                {step.title}
              </h3>
            </div>
          ))}
        </div>

        {/* Mobile Vertical Process */}
        <div className="lg:hidden flex flex-col space-y-8 relative">
          {/* Vertical Connecting Line */}
          <div className="absolute top-8 bottom-8 left-[31px] w-px bg-white/10 z-0"></div>
          
          {processSteps.map((step, idx) => (
            <div key={idx} className="relative z-10 flex items-center gap-6 group">
              <div className="w-16 h-16 shrink-0 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center group-hover:border-[#851C35] group-hover:bg-[#851C35]/10 transition-colors">
                <span className="text-lg font-bold text-white/80 group-hover:text-[#851C35] transition-colors">{step.num}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                {step.title}
              </h3>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
