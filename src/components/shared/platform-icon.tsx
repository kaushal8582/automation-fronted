import { cn } from "@/lib/utils";

export function PlatformIcon({
  platform,
  className,
}: {
  platform: string;
  className?: string;
}) {
  if (platform === "instagram") {
    return (
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-[10px] font-bold text-white",
          className,
        )}
        aria-label="Instagram"
        title="Instagram"
      >
        IG
      </span>
    );
  }

  if (platform === "facebook") {
    return (
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-md bg-[#1877F2] text-[10px] font-bold text-white",
          className,
        )}
        aria-label="Facebook"
        title="Facebook"
      >
        f
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-md bg-muted text-[10px] font-medium",
        className,
      )}
    >
      ?
    </span>
  );
}
