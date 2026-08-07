import { Button } from "@/components/ui/Button";
import { Link } from "react-router-dom";

export function CtaSection() {
  return (
    <section className="py-24 md:py-40 px-4 sm:px-6 lg:px-8 bg-brand-off-white text-brand-black">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight mb-8">
          Hedefin sana özel.<br />
          Sürecin de öyle olmalı.
        </h2>
        
        <p className="text-brand-gray text-lg sm:text-xl max-w-2xl mx-auto mb-12">
          Beklentilerini konuşmak ve sana uygun antrenman planını oluşturmak için bir ön görüşme planla.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Link to="/iletisim" className="w-full sm:w-auto">
            <Button size="lg" className="w-full bg-brand-black text-brand-off-white hover:bg-brand-gray border-none">
              Ön Görüşme Planla
            </Button>
          </Link>
          <Link to="/iletisim" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full border-brand-black text-brand-black hover:bg-brand-gray/10 hover:text-brand-black">
              İletişim
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
