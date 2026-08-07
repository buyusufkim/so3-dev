import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-none text-sm font-medium tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-metallic disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-brand-off-white text-brand-black hover:bg-brand-light-gray": variant === "default",
            "border border-brand-metallic bg-transparent hover:bg-brand-anthracite": variant === "outline",
            "hover:bg-brand-anthracite": variant === "ghost",
            "h-12 px-6 py-3": size === "default",
            "h-10 px-4": size === "sm",
            "h-14 px-8 text-base": size === "lg",
            "h-12 w-12": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
