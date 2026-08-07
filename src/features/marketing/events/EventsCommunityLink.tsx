import { Link } from "react-router-dom";

export function EventsCommunityLink() {
  return (
    <section className="py-20 md:py-24 px-4 sm:px-6 lg:px-12 bg-[#F4F1EB] text-[#0A0A0A]">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="w-1.5 h-1.5 rounded-full bg-[#851C35] mx-auto mb-6"></div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
          Etkinliklerin arkasındaki SO3 kültürünü keşfet.
        </h2>
        <p className="text-base md:text-lg text-[#0A0A0A]/70 leading-relaxed mb-8 max-w-2xl mx-auto font-medium">
          SO3 etkinlikleri, üyelerimizin salon dışında da bir araya geldiği sosyal bir ortam sunar.
        </p>
        
        <Link 
           to="/topluluk" 
           className="inline-flex items-center justify-center bg-[#0A0A0A] text-white px-8 py-4 rounded text-sm font-semibold hover:bg-[#851C35] hover:text-white transition-all group"
        >
          <span>Topluluğu keşfet</span>
          <span className="ml-3 transform transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </section>
  );
}
