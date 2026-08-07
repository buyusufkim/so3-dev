import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center space-y-4 p-12 text-center border border-brand-gray bg-brand-anthracite/50",
        className
      )}
    >
      {icon && <div className="text-brand-metallic">{icon}</div>}
      <h3 className="font-display text-xl font-medium text-brand-off-white uppercase">
        {title}
      </h3>
      <p className="text-brand-metallic max-w-md">{description}</p>
      {action && <div className="pt-4">{action}</div>}
    </div>
  );
}
