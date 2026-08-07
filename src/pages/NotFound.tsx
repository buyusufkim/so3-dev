import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        title="404 - Sayfa Bulunamadı"
        description="Aradığınız sayfa taşınmış veya artık mevcut olmayabilir."
        action={
          <Link to="/">
            <Button>Ana Sayfaya Dön</Button>
          </Link>
        }
        className="max-w-2xl w-full py-24 border-none bg-transparent"
      />
    </div>
  );
}
