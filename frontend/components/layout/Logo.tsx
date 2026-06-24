import { cn } from "@/lib/utils";

export function Logo({
  showText = true,
  className,
}: {
  showText?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="AI Workforce - Attendance Intelligence"
      className={cn("w-auto select-none", showText ? "h-9" : "h-8", className)}
      draggable={false}
    />
  );
}
