export function TourGuidance() {
  return (
    <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-12 bg-[#050505] text-white">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 border-t border-b border-white/10 py-12 md:py-16">
          <div className="flex flex-col text-center md:text-left items-center md:items-start">
            <h3 className="text-xl md:text-2xl font-bold mb-3">Gez</h3>
            <p className="text-sm md:text-base text-white/60 font-medium">Mekân içinde ilerle</p>
          </div>
          
          <div className="flex flex-col text-center items-center">
            <h3 className="text-xl md:text-2xl font-bold mb-3">Bak</h3>
            <p className="text-sm md:text-base text-white/60 font-medium">Antrenman alanlarını incele</p>
          </div>
          
          <div className="flex flex-col text-center md:text-right items-center md:items-end">
            <h3 className="text-xl md:text-2xl font-bold mb-3">Keşfet</h3>
            <p className="text-sm md:text-base text-white/60 font-medium">SO3 atmosferini kendi hızında gör</p>
          </div>
        </div>
      </div>
    </section>
  );
}
