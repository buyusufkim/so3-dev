import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  fullScreen?: boolean;
}

export function Loading({ className, fullScreen = false }: LoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center space-y-4",
        fullScreen && "min-h-screen w-full bg-brand-black",
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-brand-off-white" />
      <span className="font-display text-sm tracking-widest text-brand-metallic uppercase">
        Yükleniyor...
      </span>
    </div>
  );
}
