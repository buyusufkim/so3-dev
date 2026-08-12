import { cn } from "@/lib/utils";

interface MatterportViewerProps {
  className?: string;
}

export function MatterportViewer({ className }: MatterportViewerProps) {
  return (
    <div className={cn("relative w-full bg-[#0F0F0F] overflow-hidden border border-white/10 shadow-2xl rounded-lg", className)}>
      <iframe
        src="https://my.matterport.com/show/?m=sXAzAwRLnGs"
        className="absolute inset-0 w-full h-full border-0"
        allowFullScreen
        allow="fullscreen"
        loading="lazy"
        title="SO3 PT 360 derece sanal tur"
      ></iframe>
    </div>
  );
}
