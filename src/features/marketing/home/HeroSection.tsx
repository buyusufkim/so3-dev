import { Button } from "@/components/ui/Button";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative flex flex-col md:min-h-screen pt-20 pb-16 md:py-0 items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 bg-brand-black">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-anthracite/20 to-transparent"></div>
      
      <div className="container relative z-10 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="flex flex-col space-y-8 text-center md:text-left">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-brand-off-white leading-[1.1]">
              Herkese göre değil. <br className="hidden md:block" />
              <span className="text-brand-metallic">Sana göre.</span>
            </h1>
            
            <div className="space-y-4 max-w-lg mx-auto md:mx-0">
              <p className="text-xl sm:text-2xl text-brand-off-white font-medium">
                Kalabalığa değil, gelişimine odaklan.
              </p>
              <p className="text-brand-metallic leading-relaxed text-base sm:text-lg">
                SO3 PT, kişiye özel antrenman ve birebir takip üzerine kurulu bir Personal Training sistemidir.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center md:justify-start pt-4">
              <Link to="/iletisim" className="w-full sm:w-auto">
                <Button size="lg" className="w-full">
                  Ön Görüşme Planla
                </Button>
              </Link>
              <Link to="/so3-deneyimi" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full">
                  SO3'ü Keşfet
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="relative w-full h-[50vh] md:h-[70vh] rounded-none overflow-hidden">
             <MediaPlaceholder label="SO3 Gerçek Antrenman Görseli" aspectRatio="portrait" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}
