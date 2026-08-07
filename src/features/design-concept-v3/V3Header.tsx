import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { name: "SO3", path: "#" },
  { name: "Branşlar", path: "#" },
  { name: "Eğitmenler", path: "#" },
  { name: "Topluluk", path: "#" },
  { name: "360° Tur", path: "#" },
];

export function V3Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        isScrolled ? "bg-[#09090B] border-b border-white/10" : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex h-16 md:h-20 items-center justify-between">
          <Link to="/design-concept-v3" className="flex-shrink-0 text-white font-medium text-xl md:text-2xl tracking-tighter">
            SO3
          </Link>

          <nav className="hidden lg:flex items-center space-x-10">
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.path}
                className="text-xs font-semibold uppercase tracking-widest text-white/60 transition-colors hover:text-white"
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center space-x-8">
            <a href="#" className="text-xs font-semibold uppercase tracking-widest text-white/60 hover:text-white transition-colors">
              Üye Girişi
            </a>
            <a href="#" className="group flex items-center text-xs font-semibold uppercase tracking-widest text-white">
              <span>Ön Görüşme</span>
              <span className="ml-2 transform transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>

          <button
            className="lg:hidden text-white p-2 -mr-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-[#09090B] border-t border-white/10 px-6 py-8 h-screen">
          <nav className="flex flex-col space-y-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.path}
                className="text-2xl font-medium text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <div className="pt-8 flex flex-col space-y-6 border-t border-white/10 mt-6">
              <a href="#" className="text-xl text-white/60" onClick={() => setIsMobileMenuOpen(false)}>
                Üye Girişi
              </a>
              <a href="#" className="flex items-center text-xl text-white" onClick={() => setIsMobileMenuOpen(false)}>
                Ön Görüşme <span className="ml-2">→</span>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
