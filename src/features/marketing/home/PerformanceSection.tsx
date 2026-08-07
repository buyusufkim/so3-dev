import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function PerformanceSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 border-b border-brand-gray bg-brand-anthracite/5">
      <div className="container mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-12">
        <div className="max-w-xl text-center md:text-left">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-brand-off-white mb-4">
            Performans kültürü
          </h2>
          <p className="text-brand-metallic text-lg">
            Disiplinli çalışmanın yarışma ve sportif başarıya uzanan tarafı da SO3 kültürünün bir parçası.
          </p>
        </div>
        
        <div>
          <Link to="/basarilar" className="group flex items-center justify-center border border-brand-gray bg-brand-anthracite/30 px-8 py-6 transition-colors hover:bg-brand-anthracite hover:border-brand-metallic text-brand-off-white font-medium tracking-wide">
            Başarıları İncele
            <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
