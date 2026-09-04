import { cn } from "@/lib/utils";

type MastPlayerLogoProps = {
  variant?: "icon" | "full";
  className?: string;
};

export function MastPlayerLogo({ variant = "full", className }: MastPlayerLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
          <path d="M8.5 6.8v10.4c0 .7.8 1.1 1.4.7l8.2-5.2c.5-.3.5-1.1 0-1.4L9.9 6.1c-.6-.4-1.4 0-1.4.7Z" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-primary" />
      </span>
      {variant === "full" ? (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          MastPlayer
        </span>
      ) : null}
    </span>
  );
}
