import { useState } from "react";
import { BranchLightbox } from "./BranchLightbox";

type Branch = {
  id: string;
  name: string;
  description: string;
  cover: string;
  images: string[];
  alt: string;
};

const BRANCHES: Branch[] = [
  {
    id: "fitness",
    name: "Fitness",
    description: "Güç, kondisyon ve kişisel hedeflere göre şekillenen kişiye özel antrenman süreci.",
    cover: "/media/so3/branch-fitness.webp",
    images: [
      "/media/so3/branch-fitness.webp",
      "/media/so3/discovery-fitness.webp",
      "/media/so3/discovery-pt.webp",
      "/media/so3/performance.webp"
    ],
    alt: "SO3 fitness alanı"
  },
  {
    id: "boks",
    name: "Boks",
    description: "Kondisyon, refleks ve güç artırımı odaklı özel boks dersleri.",
    cover: "/media/so3/branch-boxing.webp",
    images: [
      "/media/so3/branch-boxing.webp",
      "/media/so3/discovery-boxing.webp",
      "/media/so3/branch-boxing-01.webp",
      "/media/so3/branch-boxing-02.webp"
    ],
    alt: "SO3 boks alanı"
  },
  {
    id: "pilates",
    name: "Pilates",
    description: "Reformer pilates ile esneklik, merkez bölge gücü ve postür gelişimi.",
    cover: "/media/so3/branch-pilates-01.webp",
    images: [
      "/media/so3/branch-pilates-01.webp"
    ],
    alt: "SO3 pilates alanı"
  },
  {
    id: "yoga",
    name: "Yoga",
    description: "Beden ve zihin bütünlüğü, esneklik ve denge odaklı pratikler.",
    cover: "/media/so3/discovery-yoga.webp",
    images: [
      "/media/so3/discovery-yoga.webp",
      "/media/so3/branch-yoga-01.webp",
      "/media/so3/branch-yoga-02.webp",
      "/media/so3/branch-yoga-03.webp"
    ],
    alt: "SO3 yoga alanı"
  }
];

export function HomeBranches() {
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);

  return (
    <section id="branslar" className="py-20 md:py-24 px-4 sm:px-6 lg:px-12 bg-[#0A0A0A] text-white scroll-mt-24 md:scroll-mt-28">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-16 gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                SO3 / BRANŞLAR
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-tight">
              Sana uygun olanı seç.<br />
              <span className="font-bold">Harekete geç.</span>
            </h2>
          </div>
        </div>

        {/* EDITORIAL GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
          {BRANCHES.map((branch, idx) => {
            let desktopSpan = "";
            let desktopHeight = "";

            if (idx === 0) { // Fitness
              desktopSpan = "lg:col-span-7";
              desktopHeight = "lg:h-[320px]";
            } else if (idx === 1) { // Boks
              desktopSpan = "lg:col-span-5";
              desktopHeight = "lg:h-[320px]";
            } else if (idx === 2) { // Pilates
              desktopSpan = "lg:col-span-5";
              desktopHeight = "lg:h-[290px]";
            } else if (idx === 3) { // Yoga
              desktopSpan = "lg:col-span-7";
              desktopHeight = "lg:h-[290px]";
            }

            return (
              <div 
                key={branch.id}
                className={`h-[260px] md:h-[300px] ${desktopHeight} ${desktopSpan} group relative rounded-md overflow-hidden border border-white/10 flex flex-col justify-end p-5 cursor-pointer`}
                onClick={() => setActiveBranch(branch)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveBranch(branch)}
                aria-label={`${branch.name} galerisini aç`}
              >
                <div className="absolute inset-0 z-0 bg-black">
                  <img src={branch.cover} alt={branch.alt} loading="lazy" className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105 group-hover:opacity-100 object-center" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent z-10 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute inset-0 bg-[#851C35]/10 mix-blend-overlay z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-20 flex justify-between items-end w-full">
                  <div className="flex-1 pr-4">
                    <div className="flex items-baseline gap-3 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                        0{idx + 1}
                      </span>
                      <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                        {branch.name}
                      </h3>
                    </div>
                    <p className="text-sm text-white/70 max-w-[260px] font-medium leading-relaxed line-clamp-2 md:line-clamp-none">
                      {branch.description}
                    </p>
                  </div>
                  <div className="flex-none flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                    <span className="hidden sm:inline-block">Galeriyi Gör</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      <BranchLightbox 
        key={activeBranch?.id ?? "closed"}
        isOpen={activeBranch !== null}
        onClose={() => setActiveBranch(null)}
        images={activeBranch?.images || []}
        title={activeBranch?.name || ""}
      />
    </section>
  );
}
