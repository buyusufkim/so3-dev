export function BranchJumpNav() {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#050505] border-b border-white/5 sticky top-16 md:top-[72px] z-40 transition-all">
      <div className="container mx-auto px-4">
        <ul className="flex items-center justify-center md:gap-12 gap-6 overflow-x-auto py-4 md:py-6 no-scrollbar snap-x">
          <li className="snap-center shrink-0">
            <a 
              href="#fitness" 
              onClick={(e) => handleScroll(e, 'fitness')}
              className="text-sm md:text-base font-semibold text-white/50 hover:text-white transition-colors whitespace-nowrap px-2"
            >
              Fitness
            </a>
          </li>
          <li className="snap-center shrink-0">
            <a 
              href="#yoga-pilates" 
              onClick={(e) => handleScroll(e, 'yoga-pilates')}
              className="text-sm md:text-base font-semibold text-white/50 hover:text-white transition-colors whitespace-nowrap px-2"
            >
              Yoga & Pilates
            </a>
          </li>
          <li className="snap-center shrink-0">
            <a 
              href="#boks" 
              onClick={(e) => handleScroll(e, 'boks')}
              className="text-sm md:text-base font-semibold text-white/50 hover:text-white transition-colors whitespace-nowrap px-2"
            >
              Boks
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
