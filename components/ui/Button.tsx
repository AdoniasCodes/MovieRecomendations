import { cn } from "@/lib/cn";
import { forwardRef } from "react";

type Variant = "primary" | "ghost" | "glass" | "outline";

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ className, variant = "primary", ...props }, ref) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100";
  const variants: Record<Variant, string> = {
    primary: "bg-accent-gradient text-white shadow-glow hover:brightness-110",
    ghost: "text-white/70 hover:text-white hover:bg-white/5",
    glass: "glass text-white hover:bg-white/10",
    outline: "border border-white/15 text-white hover:bg-white/5",
  };
  return <button ref={ref} className={cn(base, variants[variant], className)} {...props} />;
});
Button.displayName = "Button";
