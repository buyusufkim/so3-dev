import { V3Header } from "./V3Header";
import { V3Hero } from "./V3Hero";
import { V3Marquee } from "./V3Marquee";
import { V3Manifesto } from "./V3Manifesto";
import { V3Process } from "./V3Process";
import { V3Gallery } from "./V3Gallery";
import { V3Branches } from "./V3Branches";
import { V3Trainers } from "./V3Trainers";
import { V3Performance } from "./V3Performance";
import { V3Community } from "./V3Community";
import { V3Tour } from "./V3Tour";
import { V3FinalCta } from "./V3FinalCta";
import { V3Footer } from "./V3Footer";

export function DesignConceptV3Page() {
  return (
    <div className="min-h-screen bg-[#09090B] font-sans antialiased selection:bg-white selection:text-black">
      <V3Header />
      <main>
        <V3Hero />
        <V3Marquee />
        <V3Manifesto />
        <V3Process />
        <V3Gallery />
        <V3Branches />
        <V3Trainers />
        <V3Performance />
        <V3Community />
        <V3Tour />
        <V3FinalCta />
      </main>
      <V3Footer />
    </div>
  );
}
