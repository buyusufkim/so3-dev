import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { name: "SO3", path: "#so3" },
  { name: "Branşlar", path: "#branslar" },
  { name: "Eğitmenler", path: "#egitmenler" },
  { name: "Topluluk", path: "#topluluk" },
  { name: "360° Tur", path: "#tour" },
];

export function V31Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 pt-4 px-4 lg:px-8",
        isScrolled ? "translate-y-0" : "translate-y-2"
      )}
    >
      {/* Desktop Header */}
      <div className={cn(
        "hidden lg:flex items-center justify-between mx-auto max-w-7xl h-16 px-6 rounded-lg border transition-all duration-300",
        isScrolled 
          ? "bg-[#0A0A0A]/95 backdrop-blur-md border-white/10 shadow-2xl" 
          : "bg-[#0A0A0A]/60 backdrop-blur-sm border-white/5"
      )}>
        <div className="flex-shrink-0">
          <Link to="/design-concept-v3-1" className="text-white font-bold text-xl tracking-tighter">
            SO3 PT
          </Link>
        </div>

        <nav className="flex items-center space-x-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.path}
              className="relative text-[11px] font-bold uppercase tracking-[0.15em] text-white/60 hover:text-white transition-colors group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#851C35] transition-all group-hover:w-full"></span>
            </a>
          ))}
        </nav>

        <div className="flex items-center space-x-6">
          <a href="#" className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/60 hover:text-white transition-colors">
            Üye Girişi
          </a>
          <a href="#" className="group flex items-center bg-white text-black px-4 py-2 rounded text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-[#851C35] hover:text-white transition-all">
            <span>Ön Görüşme</span>
          </a>
        </div>
      </div>

      {/* Mobile Header */}
      <div className={cn(
        "lg:hidden flex items-center justify-between h-14 px-5 rounded-md border transition-all duration-300",
        isScrolled 
          ? "bg-[#0A0A0A]/95 backdrop-blur-md border-white/10" 
          : "bg-[#0A0A0A]/60 backdrop-blur-sm border-white/5"
      )}>
        <Link to="/design-concept-v3-1" className="text-white font-bold text-lg tracking-tighter z-50">
          SO3 PT
        </Link>
        <button
          className="text-white p-1 -mr-1 z-50 relative"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={cn(
        "fixed inset-0 bg-[#0A0A0A] z-40 transition-transform duration-500 ease-in-out lg:hidden",
        isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"
      )}>
        <div className="flex flex-col h-full px-6 pt-28 pb-12 overflow-y-auto">
          <nav className="flex flex-col space-y-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.path}
                className="text-2xl font-bold uppercase tracking-tight text-white flex items-center group"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="w-0 h-0.5 bg-[#851C35] mr-0 group-hover:w-4 group-hover:mr-4 transition-all"></span>
                {link.name}
              </a>
            ))}
          </nav>
          
          <div className="mt-auto pt-10 flex flex-col space-y-4">
            <a href="#" className="flex justify-center items-center bg-[#1F1F1F] text-white py-4 rounded text-sm font-bold uppercase tracking-[0.15em]" onClick={() => setIsMobileMenuOpen(false)}>
              Üye Girişi
            </a>
            <a href="#" className="flex justify-center items-center bg-white text-black py-4 rounded text-sm font-bold uppercase tracking-[0.15em]" onClick={() => setIsMobileMenuOpen(false)}>
              Ön Görüşme
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
