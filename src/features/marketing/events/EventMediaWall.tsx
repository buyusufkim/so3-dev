import { useState } from "react";
import { PublicEventDetail, PublicEventMedia } from "./publicEvent.types";
import { Play } from "lucide-react";
import { EventLightbox } from "./EventLightbox";
import { EventVideoModal } from "./EventVideoModal";

type EventMediaWallProps = {
  event: PublicEventDetail;
};

const getItemClasses = (index: number) => {
  const isMobileFull = index % 3 === 0;
  const i = index % 8;
  
  let base = "relative overflow-hidden group w-full h-full block";
  
  // Mobile
  base += isMobileFull ? " col-span-12 aspect-[4/5]" : " col-span-6 aspect-[4/5]";
  
  // Desktop
  switch (i) {
    case 0: base += " md:col-span-7 md:row-span-2 md:aspect-auto"; break;
    case 1: base += " md:col-span-5 md:row-span-1 md:aspect-[4/5]"; break;
    case 2: base += " md:col-span-5 md:row-span-1 md:aspect-[4/5]"; break;
    case 3: base += " md:col-span-4 md:row-span-1 md:aspect-[4/5]"; break;
    case 4: base += " md:col-span-4 md:row-span-1 md:aspect-[4/5]"; break;
    case 5: base += " md:col-span-4 md:row-span-1 md:aspect-[4/5]"; break;
    case 6: base += " md:col-span-5 md:row-span-1 md:aspect-[4/5]"; break;
    case 7: base += " md:col-span-7 md:row-span-1 md:aspect-[4/5]"; break;
  }
  
  return base;
};

export function EventMediaWall({ event }: EventMediaWallProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<PublicEventMedia | null>(null);

  if (!event.gallery || event.gallery.length === 0) return null;

  const images = event.gallery.filter((m) => m.media_type === "image");

  return (
    <section className="mb-16 md:mb-24">
      <div className="mb-6 md:mb-8">
        <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#851C35]">
          SO3 / ETKİNLİKTEN
        </span>
      </div>

      <div className="grid grid-cols-12 gap-3 md:gap-4">
        {event.gallery.map((item, index) => {
          const className = getItemClasses(index);

          if (item.media_type === "image") {
            const imageLightboxIndex = images.findIndex((img) => img.id === item.id);
            
            return (
              <button
                key={`story-${index}`}
                className={className}
                onClick={() => {
                  setLightboxIndex(imageLightboxIndex >= 0 ? imageLightboxIndex : 0);
                  setLightboxOpen(true);
                }}
                aria-label="Görseli büyüt"
              >
                <img
                  src={item.thumbnail_url || item.url}
                  alt={item.alt_text || event.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 md:group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 md:group-hover:bg-black/10" />
              </button>
            );
          }

          if (item.media_type === "video") {
            return (
              <div
                key={`story-${index}`}
                className={`${className} relative overflow-visible`}
              >
                {/* Burgundy editorial frame */}
                <div className="absolute inset-0 z-10 pointer-events-none border-2 border-[#851C35]" />
                
                {/* Label sitting directly on the frame */}
                <div
                  className="
                    absolute z-30
                    top-0 left-4 md:left-6
                    -translate-y-1/2
                    bg-[#851C35]
                    px-3 py-1.5
                    flex items-center gap-2
                    pointer-events-none
                  "
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span
                    className="
                      text-[8px] md:text-[9px]
                      font-bold uppercase
                      tracking-[0.22em]
                      text-white
                      whitespace-nowrap
                    "
                  >
                    SO3 / ETKİNLİK VİDEOSU
                  </span>
                </div>

                <button
                  className="
                    group relative block
                    w-full h-full
                    overflow-hidden
                    bg-black
                    text-left
                  "
                  onClick={() => {
                    setActiveVideo(item);
                    setVideoModalOpen(true);
                  }}
                  aria-label={`${event.title} videosunu izle`}
                >
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt=""
                      loading="lazy"
                      className="
                        w-full h-full object-cover
                        transition-transform duration-700
                        md:group-hover:scale-[1.03]
                      "
                    />
                  ) : (
                    <div className="w-full h-full bg-[#121212] flex items-center justify-center">
                       <span className="text-white/20 text-4xl font-bold">SO3</span>
                    </div>
                  )}

                  {/* Very restrained readability gradient */}
                  <div
                    className="
                      absolute inset-0
                      bg-gradient-to-t
                      from-black/65
                      via-transparent
                      to-black/10
                    "
                  />

                  {/* Play action */}
                  <div
                    className="
                      absolute
                      bottom-4 left-4
                      md:bottom-6 md:left-6
                      z-20
                      flex items-center gap-3
                    "
                  >
                    <div
                      className="
                        flex items-center justify-center
                        w-11 h-11 md:w-13 md:h-13
                        rounded-full
                        bg-[#851C35]
                        border border-white/20
                        shadow-lg
                        transition-all duration-300
                        group-hover:scale-110
                        group-hover:bg-[#9A203E]
                      "
                    >
                      <Play
                        className="
                          w-4 h-4 md:w-5 md:h-5
                          fill-white text-white
                          ml-0.5
                        "
                      />
                    </div>
                    <div className="flex flex-col">
                      <span
                        className="
                          text-[9px]
                          uppercase tracking-[0.18em]
                          text-white/60
                        "
                      >
                        Videoyu
                      </span>
                      <span
                        className="
                          text-xs md:text-sm
                          font-bold uppercase
                          tracking-[0.18em]
                          text-white
                        "
                      >
                        İzle
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Lightbox for images */}
      <EventLightbox
        isOpen={lightboxOpen}
        images={images}
        title={event.title}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Modal for video */}
      <EventVideoModal
        isOpen={videoModalOpen}
        onClose={() => {
          setVideoModalOpen(false);
          setActiveVideo(null);
        }}
        video={activeVideo}
      />
    </section>
  );
}
