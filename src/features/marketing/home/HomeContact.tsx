import { type PublicContactSectionContent } from "@/features/homepage/publicHomepageContent";
import { ConsultationForm } from "../contact/ConsultationForm";
import { useSiteSettings } from "@/features/site-settings/PublicSiteSettingsProvider";
import { formatTurkishPhone, toTelHref, toWhatsappUrl } from "@/features/site-settings/utils";

interface HomeContactProps {
  content: PublicContactSectionContent;
}

export function HomeContact({ content }: HomeContactProps) {
  const { settings, loading } = useSiteSettings();
  const contact = settings?.contact;
  const location = settings?.location;

  
  return (
    <section id="iletisim" className="py-20 md:py-24 bg-white text-[#0A0A0A] scroll-mt-24 md:scroll-mt-28 border-t border-black/5">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        
        {/* Contact Info & Map Row */}
        <div className="mb-16 md:mb-20">
          <div className="flex items-center gap-3 mb-8 md:mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
              {content.contact_eyebrow}
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.1] mb-10 md:mb-12">
            {content.contact_headline_primary} <span className="font-bold">{content.contact_headline_emphasis}</span>
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Info Column */}
            <div className="lg:col-span-5 flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/40">TELEFON</span>
                <div className="flex flex-col gap-2">
                  {!loading && contact?.phone_primary && (
                    <a href={toTelHref(contact.phone_primary)} className="text-2xl md:text-3xl font-semibold hover:text-[#851C35] transition-colors">
                      {formatTurkishPhone(contact.phone_primary)}
                    </a>
                  )}
                  {!loading && contact?.phone_secondary && (
                    <a href={toTelHref(contact.phone_secondary)} className="text-2xl md:text-3xl font-semibold hover:text-[#851C35] transition-colors">
                      {formatTurkishPhone(contact.phone_secondary)}
                    </a>
                  )}
                  {loading && (
                    <span className="text-2xl md:text-3xl font-semibold text-gray-300 animate-pulse">...</span>
                  )}
                </div>
              </div>
              
              {(!loading && contact?.whatsapp) && (
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/40">WHATSAPP</span>
                  <a href={toWhatsappUrl(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-xl md:text-2xl font-semibold hover:text-[#851C35] transition-colors">
                    {formatTurkishPhone(contact.whatsapp)}
                  </a>
                </div>
              )}
              
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/40">ADRES</span>
                <p className="text-lg md:text-xl font-medium text-[#0A0A0A]/80 leading-relaxed max-w-sm whitespace-pre-line">
                  {loading ? "..." : (location?.address || "Adres bilgisi şu anda görüntülenemiyor.")}
                </p>
                {!loading && location?.maps_directions_url && content.directions_cta_label && (
                  <a 
                    href={location.maps_directions_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 text-sm font-semibold text-[#851C35] mt-2"
                  >
                  <span className="relative">
                    {content.directions_cta_label}
                    <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#851C35] transition-all group-hover:w-full"></span>
                  </span>
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                )}
              </div>
            </div>
            
            {/* Map Column */}
            <div className="lg:col-span-7 bg-[#F4F1EB] rounded-lg overflow-hidden border border-[#E5E3DB] min-h-[400px]">
              {loading ? (
                <div className="w-full h-full bg-[#E5E3DB]/50 animate-pulse"></div>
              ) : location?.maps_embed_url ? (
                <iframe 
                  src={location.maps_embed_url} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0, minHeight: '400px' }} 
                  allowFullScreen={false} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="SO3 PT Kayseri konumu"
                  className="w-full h-full object-cover grayscale-[10%] contrast-[105%]"
                ></iframe>
              ) : (
                <div className="w-full h-full bg-[#E5E3DB]/30 flex items-center justify-center text-[#0A0A0A]/40 font-medium">
                  Harita şu anda görüntülenemiyor.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-[#0A0A0A]/10 mb-14 md:mb-16"></div>

        {/* Consultation Form Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
          {/* Editorial Intro Column (Left) */}
          <div className="lg:col-span-5 flex flex-col pt-4">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
                {content.consultation_eyebrow}
              </span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.1] mb-6">
              {content.consultation_headline_primary} <br className="hidden md:block" />
              <span className="font-bold">{content.consultation_headline_emphasis}</span>
            </h2>
            
            {content.consultation_intro_primary && (
              <p className="text-lg md:text-xl font-medium text-[#0A0A0A]/70 leading-relaxed mb-6">
                {content.consultation_intro_primary}
              </p>
            )}
            
            {content.consultation_intro_secondary && (
              <p className="text-base text-[#0A0A0A]/50 font-medium mb-10 max-w-sm">
                {content.consultation_intro_secondary}
              </p>
            )}
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
