import { Link } from "react-router-dom";

export function CommunityCta() {
  return (
    <section className="py-24 md:py-40 px-4 sm:px-6 lg:px-12 bg-[#F4F1EB] text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-2 h-2 rounded-full bg-[#851C35] mb-8 md:mb-12"></div>
          
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-tight mb-12 max-w-3xl">
            SO3'ü tanımanın en iyi yolu,<br className="hidden md:block" /> içinde olmak.
          </h2>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto min-w-[240px]">
            <Link 
               to="/iletisim" 
               className="w-full sm:w-auto flex items-center justify-center bg-[#0A0A0A] text-white px-8 py-5 rounded text-sm font-semibold hover:bg-[#851C35] hover:text-white transition-all group"
            >
              <span>Ön görüşme planla</span>
              <span className="ml-3 transform transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link 
               to="/branslar" 
               className="w-full sm:w-auto flex items-center justify-center bg-transparent border border-[#0A0A0A]/20 text-[#0A0A0A] px-8 py-5 rounded text-sm font-semibold hover:bg-black/5 transition-colors group"
            >
              <span>Branşları keşfet</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
