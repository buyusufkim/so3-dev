import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { LogoPlaceholder } from "../ui/LogoPlaceholder";
import { Button } from "../ui/Button";

const NAV_LINKS = [
  { name: "SO3", path: "/so3-deneyimi" },
  { name: "Branşlar", path: "/branslar" },
  { name: "Eğitmenler", path: "/egitmenler" },
  { name: "Topluluk", path: "/topluluk" },
  { name: "360° Tur", path: "/360-tur" },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-brand-gray bg-brand-black/90 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link to="/" className="flex-shrink-0">
            <LogoPlaceholder />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-sm font-medium text-brand-metallic transition-colors hover:text-brand-off-white"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <Link to="/giris">
              <Button variant="ghost" className="text-brand-metallic hover:text-brand-off-white">
                Üye Girişi
              </Button>
            </Link>
            <Link to="/iletisim">
              <Button>Ön Görüşme</Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-brand-off-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menüyü Aç"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-brand-gray bg-brand-black px-4 py-6">
          <nav className="flex flex-col space-y-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-lg font-medium text-brand-off-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-6 flex flex-col space-y-4">
              <Link to="/giris" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">
                  Üye Girişi
                </Button>
              </Link>
              <Link to="/iletisim" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full">Ön Görüşme</Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
