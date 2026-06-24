import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "hero-primary" | "hero-secondary";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-dark)] active:scale-[0.97]",
  secondary: "bg-[var(--color-text-primary)] text-white hover:opacity-90",
  outline:
    "border border-[var(--color-border-strong)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)]",
  ghost: "text-[var(--color-text-muted)] hover:bg-[var(--color-primary-xlight)] hover:text-[var(--color-primary)]",
  danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
  "hero-primary":
    "bg-white text-[var(--color-primary)] font-bold hover:opacity-92 active:scale-[0.97]",
  "hero-secondary":
    "bg-transparent text-white border-[1.5px] border-white/50 hover:bg-white/10 hover:border-white active:scale-[0.97]",
};

const sizes: Record<string, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-10 w-10",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof sizes;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-md)] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
