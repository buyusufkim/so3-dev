import { EmptyState } from "@/components/ui/EmptyState";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Link } from "react-router-dom";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        title={title}
        description="Bu modül henüz aktif değildir. Geliştirme fazlarında sırası geldiğinde yayına alınacaktır."
        icon={<Wrench className="h-10 w-10" />}
        action={
          <Link to="/">
            <Button variant="outline">Ana Sayfaya Dön</Button>
          </Link>
        }
        className="max-w-2xl w-full py-24"
      />
    </div>
  );
}
