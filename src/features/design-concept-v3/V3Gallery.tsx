import { V3MediaPlaceholder } from "./V3MediaPlaceholder";

export function V3Gallery() {
  return (
    <section className="py-24 md:py-32 bg-[#09090B] overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12 mb-16">
        <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white">Antrenmanın içinde.</h2>
      </div>

      <div className="flex gap-4 md:gap-8 px-6 lg:px-12 w-full overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar">
        
        <div className="flex-none w-[85vw] md:w-[60vw] lg:w-[45vw] snap-center">
          <V3MediaPlaceholder label="PT SESSION" aspectRatio="video" className="w-full" />
        </div>
        
        <div className="flex-none w-[70vw] md:w-[40vw] lg:w-[30vw] snap-center">
          <V3MediaPlaceholder label="FITNESS DETAY" aspectRatio="portrait" className="w-full" />
        </div>
        
        <div className="flex-none w-[85vw] md:w-[50vw] lg:w-[40vw] snap-center">
          <V3MediaPlaceholder label="EKİPMAN" aspectRatio="square" className="w-full" />
        </div>
        
        <div className="flex-none w-[70vw] md:w-[40vw] lg:w-[30vw] snap-center">
          <V3MediaPlaceholder label="EĞİTMEN & ÜYE" aspectRatio="portrait" className="w-full" />
        </div>
        
        <div className="flex-none w-[85vw] md:w-[60vw] lg:w-[45vw] snap-center pr-6 lg:pr-12">
          <V3MediaPlaceholder label="STÜDYO" aspectRatio="video" className="w-full" />
        </div>

      </div>
    </section>
  );
}
