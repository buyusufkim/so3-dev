import { V31Header } from "./V31Header";
import { V31Hero } from "./V31Hero";
import { V31BrandBand } from "./V31BrandBand";
import { V31Discovery } from "./V31Discovery";
import { V31WhySO3 } from "./V31WhySO3";
import { V31Process } from "./V31Process";
import { V31Branches } from "./V31Branches";
import { V31Trainers } from "./V31Trainers";
import { V31Performance } from "./V31Performance";
import { V31Community } from "./V31Community";
import { V31Reviews } from "./V31Reviews";
import { V31Tour } from "./V31Tour";
import { V31FinalCta } from "./V31FinalCta";
import { V31Footer } from "./V31Footer";

export function DesignConceptV31Page() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans antialiased selection:bg-[#851C35] selection:text-white">
      <V31Header />
      <main>
        <V31Hero />
        <V31BrandBand />
        <V31Discovery />
        <V31WhySO3 />
        <V31Process />
        <V31Branches />
        <V31Trainers />
        <V31Performance />
        <V31Community />
        <V31Reviews />
        <V31Tour />
        <V31FinalCta />
      </main>
      <V31Footer />
    </div>
  );
}
