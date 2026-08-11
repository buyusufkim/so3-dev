import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { name: "SO3", path: "/#so3" },
  { name: "Branşlar", path: "/#branslar" },
  { name: "Eğitmenler", path: "/#egitmenler" },
  { name: "Topluluk", path: "/#topluluk" },
  { name: "360° Tur", path: "/#tour" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isTransparent = isHomePage && !isScrolled && !isMobileMenuOpen;

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isTransparent ? "bg-transparent py-2 lg:py-4 border-b border-transparent" : "bg-[#121212] border-b border-white/10 py-0"
      )}
    >
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between mx-auto max-w-7xl px-6 lg:px-8 h-16 md:h-20 transition-all duration-300">
        <div className="flex-shrink-0">
          <Link to="/#so3" className="block hover:opacity-80 transition-opacity">
            <img src="/brand/so3-logo.png" alt="SO3 PT" className="h-8 md:h-10 lg:h-11 w-auto object-contain" />
          </Link>
        </div>

        <nav className="flex items-center space-x-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="relative text-sm font-medium text-white/70 hover:text-white transition-colors group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#851C35] transition-all group-hover:w-full"></span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-6">
          <Link to="/#iletisim" className="group flex items-center bg-white text-black px-5 py-2.5 rounded text-sm font-semibold hover:bg-[#851C35] hover:text-white transition-all">
            <span>Ön Görüşme</span>
          </Link>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between h-16 px-5 transition-all duration-300">
        <Link to="/#so3" className="z-50 block">
          <img src="/brand/so3-logo.png" alt="SO3 PT" className="h-8 w-auto object-contain" />
        </Link>
        
        <button
          id="mobile-menu-btn"
          aria-label={isMobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
          className="text-white p-2 -mr-2 z-50 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        id="mobile-menu"
        className={cn(
        "fixed inset-0 bg-[#121212] z-40 transition-transform duration-300 ease-in-out lg:hidden",
        isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"
      )}>
        <div className="flex flex-col h-full px-6 pt-24 pb-12 overflow-y-auto">
          <nav className="flex flex-col space-y-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-2xl font-bold text-white flex items-center group" tabIndex={isMobileMenuOpen ? 0 : -1}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="w-0 h-0.5 bg-[#851C35] mr-0 group-hover:w-4 group-hover:mr-4 transition-all"></span>
                {link.name}
              </Link>
            ))}
          </nav>
          
          <div className="mt-auto pt-10 flex flex-col space-y-4 border-t border-white/10">
            <Link to="/#iletisim" className="flex justify-center items-center bg-white text-black py-4 rounded text-base font-semibold hover:bg-[#851C35] hover:text-white transition-colors" tabIndex={isMobileMenuOpen ? 0 : -1} onClick={() => setIsMobileMenuOpen(false)}>
              Ön Görüşme
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
