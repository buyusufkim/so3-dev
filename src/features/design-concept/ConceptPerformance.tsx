import { ConceptMediaPlaceholder } from "./ConceptMediaPlaceholder";

export function ConceptPerformance() {
  return (
    <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-center bg-[#050505] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <ConceptMediaPlaceholder label="Performans Kültürü Görseli" className="w-full h-full object-cover opacity-30" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#050505] to-transparent z-0"></div>
      
      <div className="container relative z-10 mx-auto px-6 lg:px-12">
        <div className="max-w-2xl">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white mb-6 leading-tight">
            Performans kültürü.
          </h2>
          <p className="text-lg md:text-xl text-[#888888] font-normal leading-relaxed mb-10">
            Disiplinli çalışmanın yarışma ve sportif başarıya uzanan tarafı da SO3 kültürünün bir parçası.
          </p>
          <a href="#" className="inline-flex items-center text-white border-b border-white pb-2 hover:text-[#CCCCCC] hover:border-[#CCCCCC] transition-colors">
            <span className="text-sm font-medium tracking-wide">Başarıları incele</span>
            <span className="ml-4">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
