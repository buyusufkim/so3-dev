import { useEffect, useRef, useState } from "react";
import { EventVideo } from "./events.data";
import { X } from "lucide-react";

type EventVideoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  video: EventVideo | null;
};

export function EventVideoModal({ isOpen, onClose, video }: EventVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      if (videoRef.current) {
        videoRef.current.pause();
      }
      // Delay unmount to allow transition
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!video || (!isOpen && !mounted)) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Video Oynatıcı"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-[480px] flex items-center justify-center max-h-[90vh] transition-all duration-300 transform ${isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
          aria-label="Kapat"
        >
          <X className="w-8 h-8" />
        </button>
        <video
          ref={videoRef}
          src={video.src}
          poster={video.poster}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-[90vh] object-contain rounded-lg shadow-2xl bg-black"
        />
      </div>
    </div>
  );
}
