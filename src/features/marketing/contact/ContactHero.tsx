export function ContactHero() {
  return (
    <section className="relative h-[45svh] md:h-[60svh] min-h-[400px] flex items-center justify-center bg-[#050505] overflow-hidden border-b border-white/10">
      <div className="container relative z-10 mx-auto px-6 lg:px-12 flex flex-col items-center justify-center text-center mt-12 md:mt-16">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50">
            SO3 / İLETİŞİM
          </span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter leading-[1.05] text-white mb-4 md:mb-6 max-w-4xl">
          Önce seni tanıyalım.
        </h1>
        <p className="text-sm md:text-base text-white/70 font-medium max-w-xl mx-auto leading-relaxed">
          Hedefini ve hangi alanda çalışmak istediğini konuşarak başlayalım.
        </p>
      </div>
    </section>
  );
}
