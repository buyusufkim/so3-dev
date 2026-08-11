import { TourHero } from "../../features/marketing/tour/TourHero";
import { MatterportViewer } from "../../features/marketing/tour/MatterportViewer";
import { TourGuidance } from "../../features/marketing/tour/TourGuidance";
import { TourExplore } from "../../features/marketing/tour/TourExplore";
import { TourCta } from "../../features/marketing/tour/TourCta";

export function TourPage() {
  return (
    <main className="w-full flex flex-col min-h-screen bg-[#050505]">
      <TourHero />
      <section className="px-4 sm:px-6 lg:px-12 py-8 md:py-16">
        <div className="container mx-auto max-w-7xl">
          <MatterportViewer className="aspect-video min-h-[420px] md:min-h-[500px]" coverImage="/media/so3/tour-cover.webp" />
        </div>
      </section>
      <TourGuidance />
      <TourExplore />
      <TourCta />
    </main>
  );
}
