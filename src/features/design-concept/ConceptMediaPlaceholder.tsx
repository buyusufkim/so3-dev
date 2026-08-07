import { cn } from "@/lib/utils";

interface ConceptMediaPlaceholderProps {
  label?: string;
  className?: string;
  aspectRatio?: "video" | "square" | "portrait" | "wide" | "auto";
}

export function ConceptMediaPlaceholder({
  label = "Image",
  className,
  aspectRatio = "auto",
}: ConceptMediaPlaceholderProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center bg-[#111111] border border-[#222222] text-[#666666]",
        {
          "aspect-video": aspectRatio === "video",
          "aspect-square": aspectRatio === "square",
          "aspect-[3/4]": aspectRatio === "portrait",
          "aspect-[21/9]": aspectRatio === "wide",
          "h-full": aspectRatio === "auto",
        },
        className
      )}
    >
      <span className="text-[10px] tracking-widest uppercase opacity-40">{label}</span>
    </div>
  );
}
