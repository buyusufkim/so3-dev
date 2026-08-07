import { Link } from "react-router-dom";

export function V3Footer() {
  return (
    <footer className="bg-[#09090B] text-white py-16 md:py-24 px-6 lg:px-12 border-t border-white/10">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
          
          <div className="flex flex-col space-y-4">
            <Link to="/design-concept-v3" className="text-2xl font-medium tracking-tighter">
              SO3 PT
            </Link>
            <p className="text-sm font-medium text-white/50 max-w-xs leading-relaxed">
              Kişiye özel antrenman.<br />
              Birebir takip.
            </p>
          </div>

          <div className="flex flex-col md:text-right space-y-4">
            <p className="text-sm font-medium text-white/50">
              Kayseri, Türkiye
            </p>
            <p className="text-sm font-medium text-white/50">
              so3pt.com.tr
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}
