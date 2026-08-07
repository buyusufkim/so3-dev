export function HomeProcess() {
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l border-white/10">
          {processSteps.map((step, idx) => (
            <div key={idx} className="flex flex-col border-r border-b border-white/10 p-8 md:p-10 hover:bg-white/[0.02] transition-colors min-h-[240px]">
              <span className="text-[#851C35] font-bold text-2xl mb-8">{step.num}</span>
              <h3 className="text-2xl font-medium tracking-tight text-white mt-auto">
                {step.title}
              </h3>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
