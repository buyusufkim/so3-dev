import { Link } from "react-router-dom";

export function ContactExplore() {
  return (
    <div className="flex flex-col gap-8 pt-10">
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-bold text-[#0A0A0A]">Nereden başlayacağını bilmiyor musun?</h3>
        <p className="text-sm text-[#0A0A0A]/70 font-medium">
          Birlikte konuşabiliriz veya gelmeden önce mekânı keşfedebilirsin.
        </p>
      </div>
      
      <div className="flex flex-col gap-4">
        <Link 
          to="/branslar" 
          className="inline-flex items-center justify-between bg-white border border-[#E5E3DB] px-5 py-4 rounded text-sm font-semibold hover:border-[#0A0A0A]/30 transition-colors group"
        >
          <span className="text-[#0A0A0A]">Branşları keşfet</span>
          <span className="text-[#851C35] transform transition-transform group-hover:translate-x-1">→</span>
        </Link>
        <Link 
          to="/360-tur" 
          className="inline-flex items-center justify-between bg-white border border-[#E5E3DB] px-5 py-4 rounded text-sm font-semibold hover:border-[#0A0A0A]/30 transition-colors group"
        >
          <span className="text-[#0A0A0A]">360° Sanal Tur</span>
          <span className="text-[#851C35] transform transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </div>
  );
}
