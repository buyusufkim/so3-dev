export function ConceptProcess() {
  const steps = [
    { num: "01", title: "Seni tanırız.", desc: "Herkes aynı hedefle başlamaz. Antrenman süreci de aynı olmak zorunda değildir." },
    { num: "02", title: "Sana göre planlarız.", desc: "İhtiyacın ve çalışmak istediğin alana göre doğru eğitmenle ilerlersin." },
    { num: "03", title: "Yanında oluruz.", desc: "Antrenörün yalnızca programı vermez; süreci takip eder." },
    { num: "04", title: "Sen geliştikçe sistemi değiştiririz.", desc: "Sen geliştikçe antrenman süreci de seninle birlikte değişir." }
  ];

  return (
    <section className="py-24 md:py-40 px-6 lg:px-12 bg-[#050505] text-[#F9F9F9]">
      <div className="container mx-auto">
        <div className="flex flex-col space-y-16 md:space-y-24 max-w-5xl">
          {steps.map((step, idx) => (
            <div key={idx} className="flex flex-col md:flex-row md:items-start group">
              <div className="w-full md:w-1/4 mb-4 md:mb-0">
                <span className="text-sm font-medium tracking-widest text-[#555555] block pb-4 border-b border-[#222222] md:mr-12 group-hover:text-[#F9F9F9] group-hover:border-[#F9F9F9] transition-colors">
                  {step.num}
                </span>
              </div>
              <div className="w-full md:w-3/4 flex flex-col md:flex-row gap-6 md:gap-12 md:pt-4">
                <h3 className="text-3xl md:text-4xl font-medium tracking-tight flex-1 leading-tight">
                  {step.title}
                </h3>
                <p className="text-base md:text-lg text-[#888888] leading-relaxed flex-1 font-normal">
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
