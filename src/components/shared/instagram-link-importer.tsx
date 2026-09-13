"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import { AccountAvatar } from "@/components/shared/account-avatar";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  formatImportJobStatus,
  getImportJobs,
  humanizeImportError,
  importInstagramPublicResources,
  isImportTerminal,
  previewInstagramPublicLink,
  type ImportJob,
  type InstagramPublicPreview,
} from "@/lib/import-api";
import { createPost, createPostsBatch } from "@/lib/posts-api";
import { listMedia } from "@/lib/media-api";
import { accountLabel, listSocialAccounts, type SocialAccount } from "@/lib/social-api";
import { cn } from "@/lib/utils";

function formatBytes(size: number): string {
  if (!size || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function pickDefaultResourceIds(preview: InstagramPublicPreview): Set<string> {
  const defaults = new Set<string>();
  const videos = preview.resources.filter((r) => r.type === "video" && r.importable !== false);
  if (videos.length > 0) {
    const best = [...videos].sort((a, b) => {
      const rank = (q: string) => {
        if (/original/i.test(q)) return 3_000_000;
        if (!/^\d+\s*p$/i.test(q.trim())) return 2_000_000;
        const m = q.match(/(\d+)\s*p/i);
        return m ? Number(m[1]) * 1000 : 0;
      };
      const rq = rank(b.quality) - rank(a.quality);
      if (rq !== 0) return rq;
      return (b.size || 0) - (a.size || 0);
    })[0]!;
    defaults.add(best.id);
    return defaults;
  }
  for (const r of preview.resources) {
    if (r.importable !== false && r.type !== "audio") defaults.add(r.id);
  }
  return defaults;
}

type Phase = "idle" | "downloading" | "publishing" | "done";

type Props = {
  /** Called after download (+ optional publish) finishes. */
  onComplete?: (result: {
    mediaIds: string[];
    postIds?: string[];
    title?: string;
    caption?: string;
  }) => void;
  /** @deprecated use onComplete */
  onImported?: (mediaIds: string[], meta?: { title?: string; caption?: string }) => void;
  onViewLibrary?: () => void;
  compact?: boolean;
};

export function InstagramLinkImporter({
  onComplete,
  onImported,
  onViewLibrary,
  compact,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const finishHandledRef = useRef(false);

  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<InstagramPublicPreview | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [accountIds, setAccountIds] = useState<Set<string>>(new Set());
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [captionDraft, setCaptionDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [publishedPostIds, setPublishedPostIds] = useState<string[]>([]);

  const accountsQuery = useQuery({
    queryKey: ["social-accounts"],
    queryFn: listSocialAccounts,
  });

  const activeAccounts = useMemo(
    () => (accountsQuery.data ?? []).filter((a) => a.status === "active"),
    [accountsQuery.data],
  );
  const igAccounts = activeAccounts.filter((a) => a.platform === "instagram");
  const fbAccounts = activeAccounts.filter((a) => a.platform === "facebook");

  const previewMutation = useMutation({
    mutationFn: () => previewInstagramPublicLink(url.trim()),
    onSuccess: (data) => {
      setPreview(data);
      setCaptionDraft(data.caption || data.title || "");
      setRightsConfirmed(false);
      setImportJobs([]);
      setPublishedPostIds([]);
      setPhase("idle");
      finishHandledRef.current = false;
      setSelectedIds(pickDefaultResourceIds(data));
      setShowQuality(false);
      toast.success("Preview ready — choose where to upload");
    },
    onError: (error) => {
      setPreview(null);
      toast.error(humanizeImportError(error));
    },
  });

  const finishFlow = useCallback(
    async (mediaIds: string[]) => {
      if (finishHandledRef.current) return;
      finishHandledRef.current = true;

      await queryClient.invalidateQueries({ queryKey: ["media"] });
      const caption = captionDraft.trim() || preview?.caption || preview?.title || "";
      const meta = { title: preview?.title, caption };

      const destinations = [...accountIds];
      let postIds: string[] | undefined;

      if (destinations.length > 0) {
        setPhase("publishing");
        try {
          const fresh = await queryClient.fetchQuery({ queryKey: ["media"], queryFn: listMedia });
          const videoIds = (fresh?.media ?? [])
            .filter((m) => mediaIds.includes(m.id) && m.type === "video" && m.status === "ready")
            .map((m) => m.id);

          if (videoIds.length === 0) {
            toast.message(
              "Files saved to Media Library. Select a video quality to publish to accounts.",
            );
          } else {
            const payload = {
              socialAccountIds: destinations,
              caption: caption || undefined,
              options: { shareToFeed: true },
            };
            if (videoIds.length === 1) {
              const { post } = await createPost({ mediaId: videoIds[0]!, ...payload });
              postIds = [post.id];
            } else {
              const { posts } = await createPostsBatch({ mediaIds: videoIds, ...payload });
              postIds = posts.map((p) => p.id);
            }
            setPublishedPostIds(postIds);
            toast.success(
              `Uploaded and queued to ${destinations.length} account${destinations.length === 1 ? "" : "s"}`,
            );
            void queryClient.invalidateQueries({ queryKey: ["posts"] });
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Publish failed after download");
          // Still treat download as success for library callbacks
        }
      } else {
        toast.success("Downloaded and saved to Media Library");
      }

      setPhase("done");
      onComplete?.({ mediaIds, postIds, ...meta });
      onImported?.(mediaIds, meta);
    },
    [accountIds, captionDraft, onComplete, onImported, preview, queryClient],
  );

  useEffect(() => {
    const activeIds = importJobs.filter((j) => !isImportTerminal(j.status)).map((j) => j.id);
    if (activeIds.length === 0) {
      if (
        importJobs.length > 0 &&
        importJobs.every((j) => isImportTerminal(j.status)) &&
        phase === "downloading" &&
        !finishHandledRef.current
      ) {
        const mediaIds = importJobs
          .filter(
            (j) =>
              (j.status === "completed" || j.status === "already_imported") && j.mediaAssetId,
          )
          .map((j) => j.mediaAssetId!)
          .filter((id, i, arr) => arr.indexOf(id) === i);
        if (mediaIds.length > 0) {
          void finishFlow(mediaIds);
        } else {
          setPhase("idle");
          const failed = importJobs.find((j) => j.status === "failed");
          toast.error(failed?.errorMessage || "Download failed");
        }
      }
      return;
    }

    const timer = setInterval(() => {
      void (async () => {
        try {
          const { jobs } = await getImportJobs(importJobs.map((j) => j.id));
          setImportJobs(jobs);
        } catch {
          // ignore transient poll errors
        }
      })();
    }, 2000);

    return () => clearInterval(timer);
  }, [importJobs, phase, finishFlow]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error("Preview first");
      if (!rightsConfirmed) throw new Error("Confirm rights before uploading");
      const ids = [...selectedIds];
      if (ids.length === 0) throw new Error("Select at least one media quality");
      return importInstagramPublicResources({
        sourceUrl: preview.sourceUrl,
        resourceIds: ids,
        rightsConfirmed: true,
      });
    },
    onSuccess: (data) => {
      finishHandledRef.current = false;
      setPublishedPostIds([]);
      setPhase("downloading");
      setImportJobs(data.jobs);
      toast.success(
        accountIds.size > 0
          ? "Downloading… then uploading to your accounts"
          : "Downloading to Media Library…",
      );
    },
    onError: (error) => toast.error(humanizeImportError(error)),
  });

  function toggleResource(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAccount(id: string) {
    setAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(accounts: SocialAccount[]) {
    const ids = accounts.map((a) => a.id);
    const allOn = ids.every((id) => accountIds.has(id));
    setAccountIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  const busy = phase === "downloading" || phase === "publishing" || uploadMutation.isPending;
  const canUpload =
    Boolean(preview) &&
    rightsConfirmed &&
    selectedIds.size > 0 &&
    !busy;

  const selectedQualityLabel = useMemo(() => {
    if (!preview) return "";
    const selected = preview.resources.filter((r) => selectedIds.has(r.id));
    if (selected.length === 0) return "None selected";
    return selected
      .map((r) => `${r.type === "image" ? "Photo" : r.type === "audio" ? "Audio" : "Video"} · ${r.quality}`)
      .join(", ");
  }, [preview, selectedIds]);

  function resetForNewLink() {
    setPreview(null);
    setImportJobs([]);
    setPublishedPostIds([]);
    setPhase("idle");
    setRightsConfirmed(false);
    finishHandledRef.current = false;
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="space-y-2">
        <Label htmlFor="ig-public-url">Paste Instagram link</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="ig-public-url"
            placeholder="https://www.instagram.com/reel/…"
            value={url}
            disabled={busy}
            onChange={(e) => {
              setUrl(e.target.value);
              resetForNewLink();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && url.trim() && !previewMutation.isPending && !busy) {
                e.preventDefault();
                previewMutation.mutate();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={!url.trim() || previewMutation.isPending || busy}
            onClick={() => previewMutation.mutate()}
          >
            {previewMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Previewing…
              </>
            ) : (
              "Preview"
            )}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Preview the reel, pick accounts, then upload — download and publish stay on this page.
        </p>
      </div>

      {preview ? (
        <div className="space-y-4 rounded-xl border p-4">
          <div className="flex flex-wrap gap-4">
            {preview.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.thumbnail}
                alt=""
                className="aspect-[9/16] w-28 rounded-lg object-cover sm:w-32"
              />
            ) : null}
            <div className="min-w-0 flex-1 space-y-2 text-sm">
              <p className="font-medium leading-snug">
                {preview.title || `Instagram ${preview.externalId}`}
              </p>
              {preview.duration ? (
                <p className="text-muted-foreground text-xs">Duration {preview.duration}</p>
              ) : null}
              <p className="text-muted-foreground text-xs">
                Quality: {selectedQualityLabel}
                <button
                  type="button"
                  className="text-foreground ml-2 underline-offset-4 hover:underline"
                  disabled={busy}
                  onClick={() => setShowQuality((v) => !v)}
                >
                  {showQuality ? "Hide" : "Change"}
                </button>
              </p>
            </div>
          </div>

          {showQuality ? (
            <ul className="space-y-2">
              {preview.resources.map((resource, index) => {
                const disabled = resource.importable === false || busy;
                const checked = selectedIds.has(resource.id);
                return (
                  <li key={resource.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm",
                        checked ? "border-primary/40 bg-accent/30" : "hover:bg-muted/30",
                        disabled && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleResource(resource.id)}
                      />
                      <span className="mt-0.5">
                        {resource.type === "image" ? (
                          <ImageIcon className="text-muted-foreground size-4" />
                        ) : resource.type === "audio" ? (
                          <span className="text-muted-foreground text-xs font-medium">AUD</span>
                        ) : (
                          <Video className="text-muted-foreground size-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">
                          {index + 1}/{preview.resources.length} · {resource.format} ·{" "}
                          {resource.quality}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          {[
                            formatBytes(resource.size),
                            resource.alreadyImported ? "Already imported" : "",
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Ready"}
                        </span>
                      </span>
                      {resource.alreadyImported ? (
                        <Badge variant="secondary">Imported</Badge>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="ig-caption">Caption</Label>
            <textarea
              id="ig-caption"
              className="border-input bg-background min-h-24 w-full rounded-lg border px-3 py-2 text-sm"
              value={captionDraft}
              disabled={busy}
              onChange={(e) => setCaptionDraft(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Upload to</p>
              <p className="text-muted-foreground text-xs">
                Select accounts to publish after download. Leave empty to save only to Media Library.
              </p>
            </div>

            {accountsQuery.isLoading ? (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Loading accounts…
              </p>
            ) : activeAccounts.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-3 text-sm">
                No connected accounts.{" "}
                <Link href="/accounts" className="text-foreground underline-offset-4 hover:underline">
                  Connect Instagram or Facebook
                </Link>{" "}
                to publish, or upload to Media Library only.
              </p>
            ) : (
              <div className="space-y-4">
                <DestinationGroup
                  title="Instagram"
                  accounts={igAccounts}
                  selectedIds={accountIds}
                  disabled={busy}
                  onToggle={toggleAccount}
                  onToggleGroup={toggleGroup}
                />
                <DestinationGroup
                  title="Facebook"
                  accounts={fbAccounts}
                  selectedIds={accountIds}
                  disabled={busy}
                  onToggle={toggleAccount}
                  onToggleGroup={toggleGroup}
                />
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-dashed px-3 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={rightsConfirmed}
              disabled={busy}
              onChange={(e) => setRightsConfirmed(e.target.checked)}
            />
            <span>
              I confirm that I own this content or have permission to reuse and republish it.
            </span>
          </label>

          <Button type="button" disabled={!canUpload} onClick={() => uploadMutation.mutate()}>
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {phase === "publishing"
                  ? "Publishing…"
                  : phase === "downloading"
                    ? "Downloading…"
                    : "Starting…"}
              </>
            ) : accountIds.size > 0 ? (
              `Upload to ${accountIds.size} account${accountIds.size === 1 ? "" : "s"}`
            ) : (
              "Download & save to library"
            )}
          </Button>
        </div>
      ) : null}

      {importJobs.length > 0 ? (
        <div className="space-y-3 rounded-xl border p-4">
          <p className="text-sm font-medium">
            {phase === "downloading"
              ? "Downloading…"
              : phase === "publishing"
                ? "Uploading to accounts…"
                : phase === "done"
                  ? publishedPostIds.length > 0
                    ? "Done — queued for publishing"
                    : "Done — saved to library"
                  : "Status"}
          </p>
          <ul className="space-y-2">
            {importJobs.map((job, index) => (
              <li
                key={job.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <span>
                  File {index + 1}
                  {job.errorMessage ? (
                    <span className="text-destructive mt-0.5 block text-xs">{job.errorMessage}</span>
                  ) : null}
                </span>
                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                  {formatImportJobStatus(job.status)}
                  {!isImportTerminal(job.status) ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          {phase === "done" ? (
            <div className="flex flex-wrap gap-2">
              {publishedPostIds.length > 0 ? (
                <Button type="button" onClick={() => router.push("/posts")}>
                  View posts
                </Button>
              ) : null}
              {onViewLibrary ? (
                <Button type="button" variant="outline" onClick={onViewLibrary}>
                  View in Media Library
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => router.push("/media")}>
                  View in Media Library
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setUrl("");
                  resetForNewLink();
                }}
              >
                Paste another link
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DestinationGroup({
  title,
  accounts,
  selectedIds,
  disabled,
  onToggle,
  onToggleGroup,
}: {
  title: string;
  accounts: SocialAccount[];
  selectedIds: Set<string>;
  disabled?: boolean;
  onToggle: (id: string) => void;
  onToggleGroup: (accounts: SocialAccount[]) => void;
}) {
  if (accounts.length === 0) return null;
  const allOn = accounts.every((a) => selectedIds.has(a.id));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</p>
        <button
          type="button"
          className="text-muted-foreground text-xs underline-offset-4 hover:underline disabled:opacity-50"
          disabled={disabled}
          onClick={() => onToggleGroup(accounts)}
        >
          {allOn ? "Deselect all" : "Select all"}
        </button>
      </div>
      <ul className="space-y-2">
        {accounts.map((a) => (
          <li key={a.id}>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                selectedIds.has(a.id) ? "border-primary/40 bg-accent/40" : "hover:bg-muted/40",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="checkbox"
                className="size-4"
                checked={selectedIds.has(a.id)}
                disabled={disabled}
                onChange={() => onToggle(a.id)}
              />
              <AccountAvatar account={a} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{accountLabel(a)}</span>
                <span className="text-muted-foreground text-xs capitalize">{a.platform}</span>
              </span>
              <PlatformIcon platform={a.platform} />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
