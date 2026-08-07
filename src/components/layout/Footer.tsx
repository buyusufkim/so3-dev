import { Link } from "react-router-dom";
import { LogoPlaceholder } from "../ui/LogoPlaceholder";

export function Footer() {
  return (
    <footer className="border-t border-brand-gray bg-brand-black py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <LogoPlaceholder className="mb-6 justify-start" />
            <p className="text-brand-metallic text-sm leading-relaxed max-w-xs">
              Kişiye özel antrenman. Birebir takip. Sana göre şekillenen bir sistem.
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium tracking-wide text-brand-off-white mb-6">
              Keşfet
            </h4>
            <ul className="space-y-4">
              <li>
                <Link to="/so3-deneyimi" className="text-brand-metallic hover:text-brand-off-white text-sm transition-colors">
                  SO3 Deneyimi
                </Link>
              </li>
              <li>
                <Link to="/branslar" className="text-brand-metallic hover:text-brand-off-white text-sm transition-colors">
                  Branşlar
                </Link>
              </li>
              <li>
                <Link to="/egitmenler" className="text-brand-metallic hover:text-brand-off-white text-sm transition-colors">
                  Eğitmen Kadrosu
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium tracking-wide text-brand-off-white mb-6">
              Platform
            </h4>
            <ul className="space-y-4">
              <li>
                <Link to="/giris" className="text-brand-metallic hover:text-brand-off-white text-sm transition-colors">
                  Üye Girişi
                </Link>
              </li>
              <li>
                <Link to="/iletisim" className="text-brand-metallic hover:text-brand-off-white text-sm transition-colors">
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium tracking-wide text-brand-off-white mb-6">
              İletişim
            </h4>
            <address className="not-italic text-brand-metallic text-sm space-y-4">
              <p>Kayseri, Türkiye</p>
              <p>so3pt.com.tr</p>
            </address>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-brand-gray flex flex-col md:flex-row items-center justify-between">
          <p className="text-brand-metallic text-xs">
            © {new Date().getFullYear()} SO3 PT. Tüm hakları saklıdır.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            {/* Social links will be added here when official URLs are provided */}
          </div>
        </div>
      </div>
    </footer>
  );
}
