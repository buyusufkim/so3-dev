import { TrainerAvailabilityEditor } from "../../components/TrainerAvailabilityEditor";

export function TrainerAvailabilityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Müsaitliğim</h1>
        <p className="text-sm text-white/50 mt-1">
          Üyelerin randevu alabileceği çalışma saatlerini ve uygun olmadığınız zamanları yönetin.
        </p>
      </div>

      <TrainerAvailabilityEditor mode="trainer" />
    </div>
  );
}
