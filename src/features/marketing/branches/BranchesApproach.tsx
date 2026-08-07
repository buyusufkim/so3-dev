export function BranchesApproach() {
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#121212] text-white">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center mb-16 md:mb-20">
          <div className="w-1.5 h-1.5 rounded-full bg-[#851C35] mb-6"></div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.1] mb-6">
            Branş değişir.<br />
            <span className="font-bold">Yaklaşım değişmez.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-[#0A0A0A] border border-white/5 p-8 md:p-10 rounded-lg flex flex-col items-start text-left">
            <span className="text-[#851C35] font-bold text-lg mb-4">01</span>
            <h3 className="text-xl font-bold mb-3">Kişiye Özel Plan</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Herkes aynı hedefle başlamaz. Antrenman süreci de aynı olmak zorunda değildir.
            </p>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-8 md:p-10 rounded-lg flex flex-col items-start text-left">
            <span className="text-[#851C35] font-bold text-lg mb-4">02</span>
            <h3 className="text-xl font-bold mb-3">Sana Uygun Eğitmen</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Çalışmak istediğin alan ve hedefin doğrultusunda uygun eğitmenle ilerlersin.
            </p>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-8 md:p-10 rounded-lg flex flex-col items-start text-left">
            <span className="text-[#851C35] font-bold text-lg mb-4">03</span>
            <h3 className="text-xl font-bold mb-3">Birebir Takip</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Programı alıp kendi başına kalmazsın. Antrenman süreci eğitmeninle birlikte ilerler.
            </p>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-8 md:p-10 rounded-lg flex flex-col items-start text-left">
            <span className="text-[#851C35] font-bold text-lg mb-4">04</span>
            <h3 className="text-xl font-bold mb-3">Gelişime Göre Şekillenen Süreç</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Sen geliştikçe çalışma planı da ihtiyaçlarına göre yeniden şekillenebilir.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
