import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Play } from "lucide-react";

export function VirtualTourSection() {
  const [isTourActive, setIsTourActive] = useState(false);

  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 border-b border-brand-gray bg-brand-black">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-brand-off-white mb-6">
            Atmosferi keşfet
          </h2>
          <p className="text-brand-metallic text-lg">
            SO3’ün antrenman alanlarını gelmeden önce 360° sanal turla keşfet.
          </p>
        </div>
        
        <div className="relative w-full aspect-video bg-brand-anthracite border border-brand-gray/50 flex items-center justify-center overflow-hidden">
          {!isTourActive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="absolute inset-0 bg-brand-black/40 backdrop-blur-[2px]"></div>
              <div className="relative z-10 flex flex-col items-center space-y-6 p-6">
                <div className="h-20 w-20 rounded-full border border-brand-off-white/20 flex items-center justify-center bg-brand-black/50">
                  <Play className="h-8 w-8 text-brand-off-white ml-1" />
                </div>
                <Button 
                  size="lg" 
                  onClick={() => setIsTourActive(true)}
                  className="shadow-2xl"
                >
                  360° Turu Başlat
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              src="https://my.matterport.com/show/?m=sXAzAwRLnGs"
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
              allow="xr-spatial-tracking"
              title="SO3 PT 360 Virtual Tour"
            ></iframe>
          )}
        </div>
      </div>
    </section>
  );
}
