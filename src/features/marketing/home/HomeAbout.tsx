export function HomeAbout() {
  return (
    <section id="hakkimizda" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#F4F1EB] text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Text */}
          <div className="flex flex-col gap-6 md:gap-8">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
                SO3 HAKKINDA
              </span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight mb-2 leading-[1.15]">
              Kişiye Özel Bir<br/><span className="font-bold">Antrenman Süreci</span>
            </h2>

            <div className="flex flex-col gap-6 mt-4">
              <p className="text-lg md:text-xl font-medium tracking-tight leading-[1.5] text-[#0A0A0A]">
                SO3, kişiye özel antrenman yaklaşımını merkeze alan; fitness, boks, pilates ve yoga disiplinlerini kişisel takip ile bir araya getiren bir Personal Training merkezidir. Burada amaç, herkese aynı programı uygulamak değil; hedefe, seviyeye ve gelişime göre şekillenen bir antrenman süreci oluşturmaktır.
              </p>
              
              <p className="text-base md:text-lg font-medium tracking-tight leading-[1.5] text-[#0A0A0A]/70">
                SO3 deneyimi yalnızca ders saatinden ibaret değildir. Antrenman süreci düzenli takip, kişiye özel program güncellemeleri ve sosyal etkinliklerle devam eder. Salon içinde başlayan birliktelik, SO3 topluluğuyla salon dışında da sürer.
              </p>
            </div>
          </div>

          {/* Right Column: YouTube Video */}
          <div className="w-full relative rounded-lg overflow-hidden border border-[#E5E3DB] aspect-video bg-[#0A0A0A] shadow-2xl group">
             <iframe 
                className="w-full h-full absolute inset-0 border-0"
                src="https://www.youtube-nocookie.com/embed/0ojUK4qD8yE?autoplay=0&rel=0&modestbranding=1" 
                title="SO3 PT Tanıtım Filmi" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
                loading="lazy"
             ></iframe>
          </div>
          
        </div>
      </div>
    </section>
  );
}
