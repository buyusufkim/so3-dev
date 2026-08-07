import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { name: "SO3", path: "#" },
  { name: "Branşlar", path: "#" },
  { name: "Eğitmenler", path: "#" },
  { name: "Topluluk", path: "#" },
  { name: "360° Tur", path: "#" },
];

export function ConceptHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-[#222222] bg-[#0A0A0A]/95 backdrop-blur-md">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex h-16 items-center justify-between">
          <Link to="/design-concept" className="flex-shrink-0 text-white font-medium text-xl tracking-tight">
            SO3
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.path}
                className="text-sm font-normal text-[#888888] transition-colors hover:text-white"
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-6">
            <a href="#" className="text-sm text-[#888888] hover:text-white transition-colors">
              Üye Girişi
            </a>
            <a href="#" className="text-sm text-white hover:text-[#CCCCCC] transition-colors">
              Ön Görüşme
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-white p-2 -mr-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menüyü Aç"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#222222] bg-[#0A0A0A] px-6 py-8 h-screen">
          <nav className="flex flex-col space-y-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.path}
                className="text-2xl font-normal text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <div className="pt-8 flex flex-col space-y-6 border-t border-[#222222] mt-4">
              <a href="#" className="text-xl text-[#888888]" onClick={() => setIsMobileMenuOpen(false)}>
                Üye Girişi
              </a>
              <a href="#" className="text-xl text-white" onClick={() => setIsMobileMenuOpen(false)}>
                Ön Görüşme
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
