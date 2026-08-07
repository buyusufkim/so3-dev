import { cn } from "@/lib/utils";

interface LogoPlaceholderProps {
  className?: string;
}

export function LogoPlaceholder({ className }: LogoPlaceholderProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="relative flex h-12 w-12 items-center justify-center border-2 border-brand-off-white bg-brand-anthracite">
        <span className="font-display text-xl font-bold tracking-tighter text-brand-off-white">
          SO<sup className="text-sm">3</sup>
        </span>
        {/* Simple hexagon representation using border or clip-path could be added here, but a clean square works as placeholder too */}
      </div>
    </div>
  );
}
