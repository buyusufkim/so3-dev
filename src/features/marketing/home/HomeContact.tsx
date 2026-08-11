import { ConsultationForm } from "../contact/ConsultationForm";

export function HomeContact() {
  return (
    <section id="iletisim" className="py-24 md:py-32 bg-white text-[#0A0A0A] scroll-mt-24 md:scroll-mt-28 border-t border-black/5">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        
        {/* Contact Info & Map Row */}
        <div className="mb-24">
          <div className="flex items-center gap-3 mb-8 md:mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
              SO3 / İLETİŞİM
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.1] mb-12 md:mb-16">
            SO3'e <span className="font-bold">ulaş.</span>
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Info Column */}
            <div className="lg:col-span-5 flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/40">TELEFON</span>
                <div className="flex flex-col gap-2">
                  <a href="tel:+905539573738" className="text-2xl md:text-3xl font-semibold hover:text-[#851C35] transition-colors">0553 957 37 38</a>
                  <a href="tel:+905072077797" className="text-2xl md:text-3xl font-semibold hover:text-[#851C35] transition-colors">0507 207 77 97</a>
                </div>
              </div>
              
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/40">WHATSAPP</span>
                <a href="https://wa.me/905523790777" target="_blank" rel="noopener noreferrer" className="text-xl md:text-2xl font-semibold hover:text-[#851C35] transition-colors">
                  0552 379 07 77
                </a>
              </div>
              
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/40">ADRES</span>
                <p className="text-lg md:text-xl font-medium text-[#0A0A0A]/80 leading-relaxed max-w-sm">
                  Yıldırım Beyazıt,<br />
                  Aşık Veysel Blv. No:69/4,<br />
                  38030 Melikgazi / Kayseri
                </p>
                <a 
                  href="https://www.google.com/maps/place/SO3+Selami+%C3%96zy%C4%B1ld%C4%B1r%C4%B1m+Personal+Trainer/@38.7129364,35.5318726,17z/data=!3m1!4b1!4m6!3m5!1s0x152b136a06abeb6b:0x572b063e20953544!8m2!3d38.7129364!4d35.5318726!16s%2Fg%2F11st_bxb2b" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 text-sm font-semibold text-[#851C35] mt-2"
                >
                  <span className="relative">
                    Yol Tarifi Al
                    <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#851C35] transition-all group-hover:w-full"></span>
                  </span>
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </div>
            </div>
            
            {/* Map Column */}
            <div className="lg:col-span-7 bg-[#F4F1EB] rounded-lg overflow-hidden border border-[#E5E3DB] min-h-[400px]">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3112.5937107116843!2d35.5292976756857!3d38.71293637176466!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x152b136a06abeb6b%3A0x572b063e20953544!2sSO3%20Selami%20%C3%96zy%C4%B1ld%C4%B1r%C4%B1m%20Personal%20Trainer!5e0!3m2!1sen!2str!4v1700000000000!5m2!1sen!2str" 
                width="100%" 
                height="100%" 
                style={{ border: 0, minHeight: '400px' }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="SO3 PT Kayseri konumu"
                className="w-full h-full object-cover grayscale-[10%] contrast-[105%]"
              ></iframe>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-[#0A0A0A]/10 mb-20 md:mb-24"></div>

        {/* Consultation Form Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
          {/* Editorial Intro Column (Left) */}
          <div className="lg:col-span-5 flex flex-col pt-4">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
                SO3 / ÖN GÖRÜŞME
              </span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.1] mb-6">
              Önce seni <br className="hidden md:block" />
              <span className="font-bold">tanıyalım.</span>
            </h2>
            
            <p className="text-lg md:text-xl font-medium text-[#0A0A0A]/70 leading-relaxed mb-6">
              Hedefini ve hangi alanda çalışmak istediğini konuşarak başlayalım.
            </p>
            
            <p className="text-base text-[#0A0A0A]/50 font-medium mb-10 max-w-sm">
              Nereden başlayacağını bilmiyorsan sorun değil. Birlikte değerlendirebiliriz.
            </p>
          </div>

          {/* Form Column (Right) */}
          <div className="lg:col-span-7">
            <ConsultationForm />
          </div>
        </div>
        
      </div>
    </section>
  );
}
