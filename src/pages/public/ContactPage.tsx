import { ContactHero } from "../../features/marketing/contact/ContactHero";
import { ConsultationForm } from "../../features/marketing/contact/ConsultationForm";
import { ContactInfo } from "../../features/marketing/contact/ContactInfo";
import { ContactProcess } from "../../features/marketing/contact/ContactProcess";
import { ContactExplore } from "../../features/marketing/contact/ContactExplore";

export function ContactPage() {
  return (
    <main className="w-full flex flex-col min-h-screen bg-white">
      <ContactHero />
      
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-12">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
            {/* Form Column */}
            <div className="lg:col-span-7">
              <ConsultationForm />
            </div>
            
            {/* Info Column */}
            <div className="lg:col-span-5 flex flex-col">
              <ContactInfo />
              <div className="pt-10">
                <ContactProcess />
              </div>
              <ContactExplore />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
