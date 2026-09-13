import { cn } from "@/lib/utils";
import type { DestinationStatus, PostStatus } from "@/lib/posts-api";

const LABEL: Record<string, string> = {
  draft: "Draft",
  queued: "Queued",
  scheduled: "Scheduled",
  processing: "Processing",
  publishing: "Publishing",
  uploading: "Uploading",
  processing_media: "Processing media",
  ready_to_publish: "Ready",
  pending: "Pending",
  published: "Published",
  partially_published: "Partially published",
  failed: "Failed",
  cancelled: "Cancelled",
  active: "Connected",
  expired: "Expired",
  revoked: "Revoked",
  error: "Error",
  reconnect_required: "Reconnect required",
  completed: "Imported",
  already_imported: "Already imported",
  fetching_metadata: "Fetching metadata",
  downloading: "Downloading",
  uploading_to_r2: "Uploading",
};

function tone(status: string): string {
  switch (status) {
    case "published":
    case "active":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
    case "failed":
    case "error":
    case "revoked":
      return "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900";
    case "scheduled":
    case "pending":
      return "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900";
    case "queued":
    case "processing":
    case "publishing":
    case "uploading":
    case "uploading_to_r2":
    case "processing_media":
    case "ready_to_publish":
    case "fetching_metadata":
    case "downloading":
      return "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900";
    case "completed":
    case "already_imported":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
    case "partially_published":
    case "expired":
    case "reconnect_required":
      return "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
    case "cancelled":
      return "bg-muted text-muted-foreground ring-border";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

export function StatusBadge({
  status,
  className,
}: {
  status: PostStatus | DestinationStatus | string;
  className?: string;
}) {
  const pulse =
    status === "processing" ||
    status === "publishing" ||
    status === "queued" ||
    status === "uploading" ||
    status === "uploading_to_r2" ||
    status === "fetching_metadata" ||
    status === "downloading" ||
    status === "processing_media";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        tone(status),
        className,
      )}
    >
      {pulse ? (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-40" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {LABEL[status] ?? status.replaceAll("_", " ")}
    </span>
  );
}
