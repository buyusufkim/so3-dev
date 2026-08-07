import { ConceptHeader } from "./ConceptHeader";
import { ConceptHero } from "./ConceptHero";
import { ConceptManifesto } from "./ConceptManifesto";
import { ConceptProcess } from "./ConceptProcess";
import { ConceptBranches } from "./ConceptBranches";
import { ConceptTrainers } from "./ConceptTrainers";
import { ConceptPerformance } from "./ConceptPerformance";
import { ConceptCommunity } from "./ConceptCommunity";
import { ConceptTour } from "./ConceptTour";
import { ConceptFinalCta } from "./ConceptFinalCta";

export function DesignConceptPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#F9F9F9] font-sans">
      <ConceptHeader />
      <main>
        <ConceptHero />
        <ConceptManifesto />
        <ConceptProcess />
        <ConceptBranches />
        <ConceptTrainers />
        <ConceptPerformance />
        <ConceptCommunity />
        <ConceptTour />
        <ConceptFinalCta />
      </main>
    </div>
  );
}
