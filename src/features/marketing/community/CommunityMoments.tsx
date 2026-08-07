import { HomeMediaPlaceholder } from "../home/HomeMediaPlaceholder";

export function CommunityMoments() {
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-white text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">SO3 Dışarıda</h2>
            <p className="text-base text-[#0A0A0A]/60">
              Antrenman rutininin dışına çıkarak, farklı disiplinlerde ve ortamlarda buluşuyoruz.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Dominant Media */}
          <div className="lg:col-span-2 lg:row-span-2 group relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[400px] lg:min-h-[600px] rounded-lg">
             <HomeMediaPlaceholder label="VOLEYBOL" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-8 z-10 pointer-events-none">
                <h3 className="text-2xl font-bold text-white mb-2">Voleybol</h3>
                <p className="text-sm font-medium text-white/80">
                  SO3 üyelerinin salon dışında bir araya geldiği sportif buluşmalardan biri.
                </p>
             </div>
          </div>

          {/* Vertical/Medium Media */}
          <div className="group relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[300px] lg:min-h-0 rounded-lg">
             <HomeMediaPlaceholder label="DOĞA YÜRÜYÜŞÜ" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6 z-10 pointer-events-none">
                <h3 className="text-xl font-bold text-white mb-2">Doğa Yürüyüşleri</h3>
                <p className="text-sm font-medium text-white/80">
                  SO3 üyelerinin birlikte katıldığı doğa yürüyüşleri.
                </p>
             </div>
          </div>

          {/* Medium Media 1 */}
          <div className="group relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[300px] rounded-lg">
             <HomeMediaPlaceholder label="KANO" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6 z-10 pointer-events-none">
                <h3 className="text-xl font-bold text-white mb-2">Kano</h3>
                <p className="text-sm font-medium text-white/80">
                  SO3 üyelerinin bir araya geldiği salon dışı etkinliklerden biri.
                </p>
             </div>
          </div>

          {/* Medium Media 2 */}
          <div className="group relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[300px] rounded-lg lg:col-span-2">
             <HomeMediaPlaceholder label="PİKNİK" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6 z-10 pointer-events-none">
                <h3 className="text-xl font-bold text-white mb-2">Piknik</h3>
                <p className="text-sm font-medium text-white/80">
                  SO3 üyelerinin salon dışında birlikte zaman geçirdiği buluşmalardan biri.
                </p>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
