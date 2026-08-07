import { HomeMediaPlaceholder } from "../home/HomeMediaPlaceholder";

export function TrainerDirectory() {
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-white text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Eğitmen Kadrosu</h2>
            <p className="text-base text-[#0A0A0A]/60">
              Fitness, Yoga & Pilates ve Boks alanlarında çalışan SO3 eğitmen kadrosu.
            </p>
          </div>
        </div>

        {/* Editorial Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Trainer 1 - Dominant */}
          <div className="lg:col-span-2 lg:row-span-2 flex flex-col group relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[400px] lg:min-h-[600px] rounded-lg">
             <HomeMediaPlaceholder label="FİTNESS EĞİTMENİ" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-8 z-10 pointer-events-none">
                <span className="w-10 h-[1px] bg-[#851C35] mb-4"></span>
                <p className="text-sm font-bold text-white uppercase tracking-[0.15em] mb-1">Fitness Eğitmeni</p>
             </div>
          </div>

          {/* Trainer 2 */}
          <div className="flex flex-col group relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[300px] rounded-lg">
             <HomeMediaPlaceholder label="YOGA & PİLATES EĞİTMENİ" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6 z-10 pointer-events-none">
                <p className="text-xs font-bold text-white uppercase tracking-[0.15em] mb-1">Yoga & Pilates Eğitmeni</p>
             </div>
          </div>

          {/* Trainer 3 */}
          <div className="flex flex-col group relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[300px] rounded-lg">
             <HomeMediaPlaceholder label="BOKS EĞİTMENİ" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6 z-10 pointer-events-none">
                <p className="text-xs font-bold text-white uppercase tracking-[0.15em] mb-1">Boks Eğitmeni</p>
             </div>
          </div>

          {/* Trainer 4 */}
          <div className="flex flex-col group relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[300px] rounded-lg">
             <HomeMediaPlaceholder label="FİTNESS EĞİTMENİ" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6 z-10 pointer-events-none">
                <p className="text-xs font-bold text-white uppercase tracking-[0.15em] mb-1">Fitness Eğitmeni</p>
             </div>
          </div>

          {/* Trainer 5 */}
          <div className="flex flex-col group relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[300px] rounded-lg">
             <HomeMediaPlaceholder label="YOGA & PİLATES EĞİTMENİ" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6 z-10 pointer-events-none">
                <p className="text-xs font-bold text-white uppercase tracking-[0.15em] mb-1">Yoga & Pilates Eğitmeni</p>
             </div>
          </div>

          {/* Trainer 6 */}
          <div className="flex flex-col group relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[300px] rounded-lg">
             <HomeMediaPlaceholder label="BOKS EĞİTMENİ" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
             <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6 z-10 pointer-events-none">
                <p className="text-xs font-bold text-white uppercase tracking-[0.15em] mb-1">Boks Eğitmeni</p>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
