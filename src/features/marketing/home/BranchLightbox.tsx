import { useEffect, useRef, useState } from "react";

interface BranchLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  title: string;
}

export function BranchLightbox({ isOpen, onClose, images, title }: BranchLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Reset state when branch changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [title, images]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      dialogRef.current?.showModal();
    } else {
      document.body.style.overflow = "unset";
      dialogRef.current?.close();
    }
    
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Safe index resolution
  const safeIndex = images.length === 0 ? 0 : Math.min(currentIndex, images.length - 1);
  const currentImage = images[safeIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (images.length > 1) {
        if (e.key === "ArrowRight") handleNext();
        if (e.key === "ArrowLeft") handlePrev();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, safeIndex, images.length]);

  const handleNext = () => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <dialog 
      ref={dialogRef}
      className="fixed inset-0 z-[100] p-0 m-0 w-full h-full max-w-none max-h-none bg-transparent backdrop:bg-black/95 outline-none open:flex flex-col items-center justify-center"
      onClick={handleBackdropClick}
      aria-modal="true"
      aria-label={`${title} Galeri`}
    >
      {/* Header controls */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
        <h3 className="text-white font-semibold text-lg md:text-xl tracking-wider uppercase">{title}</h3>
        <button 
          onClick={onClose}
          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Kapat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* Main Image Container */}
      <div className="relative w-full h-full max-h-[85vh] flex items-center justify-center p-4 md:p-12" onClick={handleBackdropClick}>
        {currentImage ? (
             <img
                src={currentImage}
                alt={`${title} - Görsel ${safeIndex + 1}`}
                className="max-w-full max-h-full object-contain select-none"
                loading="lazy"
             />
        ) : null}
      </div>

      {/* Navigation & Counter */}
      {images.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white z-10 bg-black/20 md:bg-transparent"
            aria-label="Önceki Görsel"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white z-10 bg-black/20 md:bg-transparent"
            aria-label="Sonraki Görsel"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 font-medium tracking-widest text-sm bg-black/40 px-4 py-2 rounded-full">
            {safeIndex + 1} / {images.length}
          </div>
        </>
      )}
    </dialog>
  );
}
