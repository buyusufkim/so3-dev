import { useState } from "react";
import { HomeMediaPlaceholder } from "../home/HomeMediaPlaceholder";
import { cn } from "@/lib/utils";

interface MatterportViewerProps {
  className?: string;
  coverLabel?: string;
  isActive?: boolean;
  onPlay?: () => void;
}

export function MatterportViewer({ className, coverLabel = "360° MEKÂN GÖRSELİ", isActive: externalIsActive, onPlay }: MatterportViewerProps) {
  const [internalIsActive, setInternalIsActive] = useState(false);
  
  const isActive = externalIsActive !== undefined ? externalIsActive : internalIsActive;
  
  const handlePlay = () => {
    if (onPlay) {
      onPlay();
    } else {
      setInternalIsActive(true);
    }
  };

  return (
    <div className={cn("relative w-full bg-[#0F0F0F] overflow-hidden border border-white/10 shadow-2xl rounded-lg", className)}>
      {!isActive ? (
        <button 
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center group cursor-pointer appearance-none border-none outline-none focus-visible:ring-2 focus-visible:ring-white/50" 
          onClick={handlePlay} 
          aria-label="360 derece turu başlat"
        >
          <HomeMediaPlaceholder label={coverLabel} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#851C35] text-white flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(133,28,53,0.4)] group-hover:scale-110 transition-transform">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="ml-2">
                <path d="M5 3l14 9-14 9V3z"/>
              </svg>
            </div>
            <span className="lg:hidden flex items-center bg-white text-black px-6 py-4 rounded text-sm font-semibold">
              360° turu başlat <span className="ml-2">→</span>
            </span>
          </div>
        </button>
      ) : (
        <iframe
          src="https://my.matterport.com/show/?m=sXAzAwRLnGs"
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
          allow="xr-spatial-tracking"
          title="SO3 PT 360° Sanal Tur"
        ></iframe>
      )}
    </div>
  );
}
