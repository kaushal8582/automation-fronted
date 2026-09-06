"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/media-api";

type MediaPreviewProps = {
  publicUrl: string;
  type: "video" | "image" | "thumbnail" | string;
  filename?: string;
  fileSize?: number;
  className?: string;
  /** Compact card for grids */
  variant?: "card" | "inline";
  selected?: boolean;
  onSelect?: () => void;
  showMeta?: boolean;
};

export function MediaPreview({
  publicUrl,
  type,
  filename,
  fileSize,
  className,
  variant = "card",
  selected,
  onSelect,
  showMeta = true,
}: MediaPreviewProps) {
  const [playing, setPlaying] = useState(false);
  const isVideo = type === "video" || /\.(mp4|mov|webm)(\?|$)/i.test(publicUrl);

  const media = isVideo ? (
    playing || variant === "inline" ? (
      <video
        src={publicUrl}
        className="h-full w-full object-cover"
        controls
        playsInline
        preload="metadata"
        autoPlay={playing}
        onClick={(e) => e.stopPropagation()}
      />
    ) : (
      <button
        type="button"
        className="group relative h-full w-full"
        onClick={(e) => {
          e.stopPropagation();
          setPlaying(true);
        }}
        aria-label={filename ? `Play ${filename}` : "Play video"}
      >
        <video
          src={publicUrl}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/35">
          <span className="flex size-11 items-center justify-center rounded-full bg-white/95 text-black shadow">
            <Play className="size-5 fill-current pl-0.5" />
          </span>
        </span>
      </button>
    )
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={publicUrl} alt={filename ?? "Media"} className="h-full w-full object-cover" />
  );

  if (variant === "inline") {
    return (
      <div className={cn("overflow-hidden rounded-xl border bg-black/5", className)}>
        <div className="aspect-video w-full">{media}</div>
        {showMeta && filename ? (
          <div className="border-t px-3 py-2">
            <p className="truncate text-sm font-medium">{filename}</p>
            {fileSize != null ? (
              <p className="text-muted-foreground text-xs">{formatBytes(fileSize)}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "w-full overflow-hidden rounded-xl border text-left transition",
          selected ? "border-primary ring-primary/30 ring-2" : "hover:border-foreground/20",
          "cursor-pointer",
          className,
        )}
      >
        <div className="bg-muted aspect-video w-full overflow-hidden">{media}</div>
        {showMeta ? (
          <div className="space-y-0.5 px-3 py-2">
            {filename ? <p className="truncate text-sm font-medium">{filename}</p> : null}
            {fileSize != null ? (
              <p className="text-muted-foreground text-xs">{formatBytes(fileSize)}</p>
            ) : null}
          </div>
        ) : null}
      </button>
    );
  }

  return (
    <div className={cn("w-full overflow-hidden rounded-xl border", className)}>
      <div className="bg-muted aspect-video w-full overflow-hidden">{media}</div>
      {showMeta ? (
        <div className="space-y-0.5 px-3 py-2">
          {filename ? <p className="truncate text-sm font-medium">{filename}</p> : null}
          {fileSize != null ? (
            <p className="text-muted-foreground text-xs">{formatBytes(fileSize)}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
