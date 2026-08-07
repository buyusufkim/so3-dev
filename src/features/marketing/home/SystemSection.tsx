import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";

export function SystemSection() {
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 border-b border-brand-gray bg-brand-anthracite/20">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row gap-16 md:gap-24 items-center">
          <div className="w-full md:w-1/2 order-2 md:order-1">
             <MediaPlaceholder label="SO3 Eğitmen-Üye Çalışma Anı" aspectRatio="square" className="w-full" />
          </div>
          
          <div className="w-full md:w-1/2 flex flex-col space-y-8 order-1 md:order-2">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-brand-off-white">
              Sistem sana göre çalışır.
            </h2>
            <div className="h-px w-24 bg-brand-metallic/30"></div>
            
            <div className="space-y-12 pt-4">
              <div className="space-y-3">
                <h3 className="text-xl font-medium text-brand-off-white">Kişiye özel plan</h3>
                <p className="text-brand-metallic leading-relaxed">
                  Herkes aynı hedefle başlamaz. Antrenman süreci de aynı olmak zorunda değildir.
                </p>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-xl font-medium text-brand-off-white">Birebir takip</h3>
                <p className="text-brand-metallic leading-relaxed">
                  Antrenörün yalnızca programı vermez; süreci takip eder.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-medium text-brand-off-white">Sana uygun antrenör</h3>
                <p className="text-brand-metallic leading-relaxed">
                  İhtiyacın ve çalışmak istediğin alana göre doğru eğitmenle ilerlersin.
                </p>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-xl font-medium text-brand-off-white">Gelişime göre şekillenen süreç</h3>
                <p className="text-brand-metallic leading-relaxed">
                  Sen geliştikçe antrenman süreci de seninle birlikte değişir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
