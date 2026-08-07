import { cn } from "@/lib/utils";

interface HomeMediaPlaceholderProps {
  label?: string;
  className?: string;
  aspectRatio?: "video" | "square" | "portrait" | "wide" | "auto";
  light?: boolean;
}

export function HomeMediaPlaceholder({
  label = "Image",
  className,
  aspectRatio = "auto",
  light = false,
}: HomeMediaPlaceholderProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center overflow-hidden relative group",
        light 
          ? "bg-[#E5E3DB] border border-[#D5D3CB] text-[#9A9891]" 
          : "bg-[#0F0F0F] border border-[#1F1F1F] text-[#4A4A4A]",
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
      <div 
        className={cn(
          "absolute inset-0 opacity-40 mix-blend-overlay",
          light 
            ? "bg-gradient-to-br from-white/40 to-transparent" 
            : "bg-gradient-to-tr from-black/80 via-transparent to-white/5"
        )} 
      />
      <svg className="absolute inset-0 w-full h-full opacity-[0.015] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
      </svg>
      <span className={cn(
        "relative z-10 text-[10px] font-semibold tracking-[0.25em] uppercase opacity-70 transition-opacity",
        light ? "group-hover:text-black group-hover:opacity-100" : "group-hover:text-white group-hover:opacity-100"
      )}>
        {label}
      </span>
    </div>
  );
}
