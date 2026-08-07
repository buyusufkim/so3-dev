import { Link } from "react-router-dom";

export function TourExplore() {
  return (
    <section className="py-20 md:py-24 px-4 sm:px-6 lg:px-12 bg-white text-[#0A0A0A]">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
          Mekânı gördün.<br />Şimdi nasıl çalıştığımızı keşfet.
        </h2>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 w-full sm:w-auto">
          <Link 
            to="/branslar" 
            className="w-full sm:w-auto inline-flex items-center justify-center bg-[#0A0A0A] text-white px-8 py-4 rounded text-sm font-semibold hover:bg-[#851C35] transition-colors group"
          >
            <span>Branşları keşfet</span>
            <span className="ml-3 transform transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link 
            to="/egitmenler" 
            className="w-full sm:w-auto inline-flex items-center justify-center bg-transparent border border-[#0A0A0A]/20 text-[#0A0A0A] px-8 py-4 rounded text-sm font-semibold hover:bg-black/5 transition-colors"
          >
            Eğitmenleri keşfet
          </Link>
        </div>
      </div>
    </section>
  );
}
