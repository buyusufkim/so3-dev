import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function CommunitySection() {
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 border-b border-brand-gray">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="space-y-8">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-brand-off-white">
              Bireysel gelişim.<br />Güçlü bir topluluk.
            </h2>
            <div className="h-px w-24 bg-brand-metallic/30"></div>
            
            <p className="text-brand-metallic text-lg leading-relaxed">
              SO3 birlikteliği antrenmanla sınırlı kalmaz. Voleybol, doğa yürüyüşleri, kano ve piknik gibi etkinliklerde üyeler salon dışında da bir araya gelir.
            </p>
            
            <Link to="/topluluk" className="inline-flex items-center text-brand-off-white font-medium hover:text-brand-metallic transition-colors pt-4">
              Etkinlikleri İncele
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4 translate-y-8">
              <MediaPlaceholder label="Doğa Yürüyüşü" aspectRatio="portrait" />
              <MediaPlaceholder label="Kano Etkinliği" aspectRatio="square" />
            </div>
            <div className="space-y-4">
              <MediaPlaceholder label="Voleybol Maçı" aspectRatio="square" />
              <MediaPlaceholder label="Topluluk Pikniği" aspectRatio="portrait" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
