import { cn } from "@/lib/utils";

interface MediaPlaceholderProps {
  label?: string;
  className?: string;
  aspectRatio?: "video" | "square" | "portrait" | "wide";
}

export function MediaPlaceholder({
  label = "Görsel Alanı",
  className,
  aspectRatio = "video",
}: MediaPlaceholderProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center bg-brand-anthracite border border-brand-gray/50 text-brand-metallic",
        {
          "aspect-video": aspectRatio === "video",
          "aspect-square": aspectRatio === "square",
          "aspect-[3/4]": aspectRatio === "portrait",
          "aspect-[21/9]": aspectRatio === "wide",
        },
        className
      )}
    >
      <span className="text-[10px] tracking-wide opacity-50">{label}</span>
    </div>
  );
}
