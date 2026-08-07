export function TrainerApproach() {
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#121212] text-white">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row gap-12 lg:gap-24">
          <div className="w-full md:w-1/3">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.1] mb-6">
              Sana uygun antrenör.<br />
              <span className="font-bold">Sana göre bir süreç.</span>
            </h2>
            <p className="text-white/60 leading-relaxed text-base">
              Personal Training sürecinde çalıştığın eğitmen, deneyimin önemli bir parçasıdır.
            </p>
          </div>

          <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            <div className="flex flex-col border-t border-white/10 pt-6">
              <span className="text-[#851C35] font-bold text-sm mb-4">01</span>
              <h3 className="text-lg font-bold mb-3">İhtiyacına Göre Eşleşme</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Çalışmak istediğin alan ve hedefin doğrultusunda uygun eğitmenle ilerlersin.
              </p>
            </div>
            
            <div className="flex flex-col border-t border-white/10 pt-6">
              <span className="text-[#851C35] font-bold text-sm mb-4">02</span>
              <h3 className="text-lg font-bold mb-3">Birebir İletişim</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Antrenman sırasında eğitmeninle doğrudan iletişim kurar, çalışmayı birlikte yürütürsün.
              </p>
            </div>
            
            <div className="flex flex-col border-t border-white/10 pt-6">
              <span className="text-[#851C35] font-bold text-sm mb-4">03</span>
              <h3 className="text-lg font-bold mb-3">Süreç Boyunca Takip</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Personal Training süreci, programı alıp kendi başına devam ettiğin bir yapı değildir; çalışmalar eğitmeninle birlikte ilerler.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
