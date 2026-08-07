import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const BRANCHES = [
  {
    id: "fitness",
    title: "Fitness",
    desc: "Güç, kondisyon ve kişisel hedeflerine göre şekillenen antrenmanlar.",
  },
  {
    id: "yoga-pilates",
    title: "Yoga & Pilates",
    desc: "Kontrol, denge, mobilite ve bedensel farkındalığa odaklanan çalışmalar.",
  },
  {
    id: "boks",
    title: "Boks",
    desc: "Teknik, kondisyon ve koordinasyonu bir araya getiren birebir çalışmalar.",
  }
];

export function BranchesSection() {
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 border-b border-brand-gray">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-brand-off-white mb-6">
              Hedef değişir. Merkezde yine sen varsın.
            </h2>
            <p className="text-brand-metallic text-lg">
              Farklı disiplinler, ortak kalite standardı. Hangi alanda ilerlemek istersen, o alandaki uzman eğitmenle çalışırsın.
            </p>
          </div>
          <Link to="/branslar" className="group flex items-center text-brand-off-white font-medium hover:text-brand-metallic transition-colors">
            Tüm Branşları İncele
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {BRANCHES.map((branch) => (
            <div key={branch.id} className="group flex flex-col cursor-pointer">
              <div className="overflow-hidden mb-6">
                <MediaPlaceholder 
                  label={`SO3 ${branch.title} Görseli`} 
                  aspectRatio="portrait" 
                  className="w-full transform transition-transform duration-700 group-hover:scale-105" 
                />
              </div>
              <h3 className="text-2xl font-medium tracking-wide text-brand-off-white mb-3">
                {branch.title}
              </h3>
              <p className="text-brand-metallic leading-relaxed">
                {branch.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
