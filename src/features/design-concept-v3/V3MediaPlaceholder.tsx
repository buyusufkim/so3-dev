import { cn } from "@/lib/utils";

interface V3MediaPlaceholderProps {
  label?: string;
  className?: string;
  aspectRatio?: "video" | "square" | "portrait" | "wide" | "auto";
}

export function V3MediaPlaceholder({
  label = "Image",
  className,
  aspectRatio = "auto",
}: V3MediaPlaceholderProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center bg-[#18181B] border border-[#27272A] text-[#71717A] overflow-hidden relative group",
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
      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
      <span className="relative z-10 text-[11px] font-medium tracking-[0.2em] uppercase opacity-60 group-hover:opacity-100 transition-opacity">{label}</span>
    </div>
  );
}
