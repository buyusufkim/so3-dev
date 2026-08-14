import { type PublicTrainer, parsePublicTrainersResponse } from "@/features/trainers/publicTrainers";
import { HomeMediaPlaceholder } from "./HomeMediaPlaceholder";
import { useRef, useEffect, useState } from "react";

export function HomeTrainers() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [trainers, setTrainers] = useState<PublicTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchTrainers() {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch("/api/public/trainers");
        if (!res.ok) throw new Error("Failed to fetch trainers");
        
        const json: unknown = await res.json();
        const parsedTrainers = parsePublicTrainersResponse(json);
        if (mounted) {
          setTrainers(parsedTrainers);
        }
      } catch (err) {
        if (mounted) {
          setError(true);
          setTrainers([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchTrainers();
    return () => { mounted = false; };
  }, []);


  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [trainers]);
  
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    if (!isVisible || isPaused || trainers.length <= 1) return;

    let animationFrameId: number;
    let lastTime = 0;
    const speed = 0.05; // pixels per millisecond
    let startTimeout: ReturnType<typeof setTimeout>;

    const animate = (time: number) => {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;

      if (scrollRef.current) {
        scrollRef.current.scrollLeft += speed * delta;
        
        if (scrollRef.current.scrollLeft >= scrollRef.current.scrollWidth / 2) {
           scrollRef.current.scrollLeft -= scrollRef.current.scrollWidth / 2;
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    startTimeout = setTimeout(() => {
      animationFrameId = requestAnimationFrame(animate);
    }, 800);

    return () => {
      clearTimeout(startTimeout);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPaused, isVisible, trainers.length]);
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.5;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section ref={sectionRef} id="egitmenler" className="py-24 md:py-32 bg-white text-[#0A0A0A] scroll-mt-24 md:scroll-mt-28 overflow-hidden">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-16 gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
                SO3 / EKİP
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight mb-6 leading-tight">
              Profesyonel Eğitim Kadrosu
            </h2>
            <p className="text-lg md:text-xl text-[#0A0A0A]/70 font-medium leading-relaxed">
              SO3 antrenör kadromuzla tanışın.
            </p>
          </div>
          
          <div className="hidden md:flex gap-4 items-center" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
            <button 
              onClick={() => scroll('left')}
              className="w-12 h-12 rounded-full border border-[#0A0A0A]/20 flex items-center justify-center hover:bg-[#0A0A0A] hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/50"
              aria-label="Önceki eğitmenler"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button 
              onClick={() => scroll('right')}
              className="w-12 h-12 rounded-full border border-[#0A0A0A]/20 flex items-center justify-center hover:bg-[#0A0A0A] hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/50"
              aria-label="Sonraki eğitmenler"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="flex overflow-hidden gap-3 md:gap-4 px-4 sm:px-6 lg:px-12 pb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-none w-[calc(100vw/1.4)] sm:w-[calc(100vw/2.8)] md:w-[calc(100vw/4.5)] lg:w-[calc(100vw/4.8)] max-w-[280px] aspect-[3/4] bg-[#0A0A0A]/5 animate-pulse rounded-sm border border-[#0A0A0A]/10"></div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="w-full px-4 sm:px-6 lg:px-12">
          <div className="py-16 flex items-center justify-center border border-[#0A0A0A]/10 rounded-sm bg-[#0A0A0A]/5">
            <p className="text-[#0A0A0A]/50 font-medium">Eğitmen kadrosu şu anda görüntülenemiyor.</p>
          </div>
        </div>
      )}

      {!loading && !error && trainers.length === 0 && (
        <div className="w-full px-4 sm:px-6 lg:px-12">
          <div className="py-16 flex items-center justify-center border border-[#0A0A0A]/10 rounded-sm bg-[#0A0A0A]/5">
            <p className="text-[#0A0A0A]/50 font-medium">Şu anda görüntülenecek aktif eğitmen bulunmuyor.</p>
          </div>
        </div>
      )}

      {/* Full Bleed Rail Container */}
      {!loading && !error && trainers.length > 0 && (
        <div 
          className="w-full relative px-4 sm:px-6 lg:px-12 mx-auto max-w-[2560px]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          <div 
            ref={scrollRef}
            className="flex overflow-x-auto gap-3 md:gap-4 pb-8 snap-x snap-mandatory hide-scrollbar"
          >
            {[...trainers, ...trainers].map((trainer, index) => (
              <div 
                key={`${trainer.slug}-${index}`} 
                className="flex-none w-[calc(100vw/1.4)] sm:w-[calc(100vw/2.8)] md:w-[calc(100vw/4.5)] lg:w-[calc(100vw/4.8)] min-[1366px]:w-[calc(100vw/6.5)] 2xl:w-[calc(100vw/9)] max-w-[280px] min-[1366px]:max-w-[260px] snap-start flex flex-col group relative"
              >
                <div className="relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] aspect-[3/4] mb-3 rounded-sm">
                  {trainer.profile?.url ? (
                    <img src={trainer.profile.url} alt={trainer.profile.alt_text || `${trainer.name} profil fotoğrafı`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <HomeMediaPlaceholder label="EĞİTMEN" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                
                <div className="flex flex-col">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-sm md:text-base font-bold tracking-tight uppercase leading-none break-words">
                      {trainer.name}
                    </h3>
                    {trainer.instagram_username && (
                      <a 
                        href={`https://www.instagram.com/${trainer.instagram_username}/`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#0A0A0A]/50 hover:text-[#851C35] transition-colors shrink-0"
                        aria-label={`${trainer.name} Instagram`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] md:text-xs font-semibold text-[#0A0A0A]/50 uppercase tracking-widest mt-1">
                    {trainer.role_title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
