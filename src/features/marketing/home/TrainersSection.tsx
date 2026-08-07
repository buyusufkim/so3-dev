import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { Button } from "@/components/ui/Button";
import { Link } from "react-router-dom";

export function TrainersSection() {
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 border-b border-brand-gray bg-brand-anthracite/10">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-brand-off-white mb-6">
            Kişisel antrenman, kişisel ilgiyi gerektirir.
          </h2>
          <p className="text-brand-metallic text-lg">
            Doğru takip, doğru iletişimle başlar. SO3’te antrenman sürecin, çalıştığın eğitmenle birlikte şekillenir.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-16">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col">
              <MediaPlaceholder 
                label={`Eğitmen Portresi ${i}`} 
                aspectRatio="portrait" 
                className="w-full mb-4 opacity-80 mix-blend-luminosity hover:mix-blend-normal hover:opacity-100 transition-all duration-500" 
              />
            </div>
          ))}
        </div>
        
        <div className="flex justify-center">
          <Link to="/egitmenler">
            <Button variant="outline" size="lg">
              Kadroyu Keşfet
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
