import { Link } from "react-router-dom";

export function TourCta() {
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#F4F1EB] text-[#0A0A0A]">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="w-2 h-2 rounded-full bg-[#851C35] mx-auto mb-8"></div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">
          Ekrandan görmek başka.<br />
          SO3'ü deneyimlemek başka.
        </h2>
        <p className="text-base md:text-lg text-[#0A0A0A]/70 leading-relaxed mb-10 max-w-xl mx-auto font-medium">
          SO3'ü yakından tanımak için ön görüşme planla.
        </p>
        
        <Link 
          to="/iletisim" 
          className="inline-flex items-center justify-center bg-[#0A0A0A] text-white px-8 py-5 rounded text-sm font-semibold hover:bg-[#851C35] hover:text-white transition-all group"
        >
          <span>Ön görüşme planla</span>
          <span className="ml-3 transform transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </section>
  );
}
