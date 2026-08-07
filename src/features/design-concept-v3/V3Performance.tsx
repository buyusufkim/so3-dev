import { V3MediaPlaceholder } from "./V3MediaPlaceholder";

export function V3Performance() {
  return (
    <section className="relative min-h-[80vh] flex items-center bg-[#09090B] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <V3MediaPlaceholder label="PERFORMANS FOTOĞRAFI" className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-[#09090B]/30 z-10"></div>
      
      <div className="container relative z-20 mx-auto px-6 lg:px-12 py-24 md:py-32 flex flex-col justify-end h-full">
        <div className="max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 mb-6 block">
            SO3 / PERFORMANCE
          </span>
          <h2 className="text-5xl sm:text-6xl md:text-[5rem] lg:text-[7rem] font-bold tracking-tighter text-white mb-8 leading-[0.9]">
            PERFORMANS <br />
            TESADÜF DEĞİLDİR.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <p className="text-lg md:text-xl text-white/80 font-medium leading-relaxed">
              Disiplinli çalışmanın yarışma ve sportif başarıya uzanan tarafı da SO3 kültürünün bir parçası.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
