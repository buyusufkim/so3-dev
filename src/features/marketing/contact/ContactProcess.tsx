export function ContactProcess() {
  return (
    <div className="flex flex-col gap-8">
      <h3 className="text-xl font-bold text-[#0A0A0A]">Nasıl İlerliyoruz?</h3>
      
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0A0A0A]/5 flex items-center justify-center text-xs font-bold text-[#0A0A0A]">
            01
          </div>
          <div className="flex flex-col gap-1 pt-1.5">
            <h4 className="text-sm font-bold text-[#0A0A0A]">Bize ulaş</h4>
            <p className="text-sm text-[#0A0A0A]/70 leading-relaxed font-medium">
              Online ön görüşme talebi aktif olduğunda bilgilerini bizimle paylaşarak süreci başlatabilirsin.
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0A0A0A]/5 flex items-center justify-center text-xs font-bold text-[#0A0A0A]">
            02
          </div>
          <div className="flex flex-col gap-1 pt-1.5">
            <h4 className="text-sm font-bold text-[#0A0A0A]">Hedefini konuşalım</h4>
            <p className="text-sm text-[#0A0A0A]/70 leading-relaxed font-medium">
              İlk görüşmede hedefini ve hangi alanda çalışmak istediğini konuşuruz.
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0A0A0A]/5 flex items-center justify-center text-xs font-bold text-[#0A0A0A]">
            03
          </div>
          <div className="flex flex-col gap-1 pt-1.5">
            <h4 className="text-sm font-bold text-[#0A0A0A]">Çalışma yönünü değerlendirelim</h4>
            <p className="text-sm text-[#0A0A0A]/70 leading-relaxed font-medium">
              Sana uygun çalışma modeli ve branş alternatiflerini birlikte netleştirelim.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
