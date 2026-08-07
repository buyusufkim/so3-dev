export function V3Process() {
  const steps = [
    { num: "01", title: "Seni tanırız.", desc: "Herkes aynı hedefle başlamaz. Antrenman süreci de aynı olmak zorunda değildir." },
    { num: "02", title: "Sana göre planlarız.", desc: "İhtiyacın ve çalışmak istediğin alana göre doğru eğitmenle ilerlersin." },
    { num: "03", title: "Yanında oluruz.", desc: "Antrenörün yalnızca programı vermez; süreci takip eder." },
    { num: "04", title: "Sen geliştikçe sistem değişir.", desc: "Gelişimine paralel olarak antrenman süreci de seninle birlikte değişir." }
  ];

  return (
    <section className="py-24 md:py-32 px-6 lg:px-12 bg-white text-[#09090B]">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-20">
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight">PT Sistemi</h2>
        </div>

        <div className="flex flex-col border-t border-[#09090B]/10">
          {steps.map((step, idx) => (
            <div key={idx} className="group flex flex-col md:flex-row md:items-center py-10 md:py-16 border-b border-[#09090B]/10 hover:bg-[#F9F9F9] transition-colors -mx-6 px-6 lg:-mx-12 lg:px-12">
              
              <div className="md:w-1/4 mb-6 md:mb-0">
                <span className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-[#09090B]/10 group-hover:text-[#09090B]/30 transition-colors">
                  {step.num}
                </span>
              </div>
              
              <div className="md:w-1/2 mb-4 md:mb-0 pr-8">
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight leading-tight">
                  {step.title}
                </h3>
              </div>
              
              <div className="md:w-1/4">
                <p className="text-lg text-[#09090B]/60 leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>
              
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
