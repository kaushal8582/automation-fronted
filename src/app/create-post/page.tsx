"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { AccountAvatar } from "@/components/shared/account-avatar";
import { MediaPreview } from "@/components/shared/media-preview";
import { PageHeader } from "@/components/shared/page-header";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearBatchMediaIds, readBatchMediaIds } from "@/lib/batch-media";
import {
  completeMedia,
  listMedia,
  presignMedia,
  uploadToR2,
  type MediaAsset,
} from "@/lib/media-api";
import { createPost, createPostsBatch, PostsApiError } from "@/lib/posts-api";
import { accountLabel, listSocialAccounts, type SocialAccount } from "@/lib/social-api";
import { cn } from "@/lib/utils";

const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function AccountGroup({
  title,
  accounts,
  selectedIds,
  onToggle,
  onToggleGroup,
}: {
  title: string;
  accounts: SocialAccount[];
  selectedIds: Set<string>;
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
          className="text-muted-foreground text-xs underline-offset-4 hover:underline"
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
              )}
            >
              <input
                type="checkbox"
                className="size-4"
                checked={selectedIds.has(a.id)}
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

async function captureFrameAsJpeg(videoUrl: string): Promise<File> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video for thumbnail"));
  });

  video.currentTime = Math.min(0.5, (video.duration || 1) * 0.1);
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 720;
  canvas.height = video.videoHeight || 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to capture frame"))),
      "image/jpeg",
      0.9,
    );
  });

  return new File([blob], `thumb-${Date.now()}.jpg`, { type: "image/jpeg" });
}

function CreatePostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const frameVideoRef = useRef<HTMLVideoElement>(null);

  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [accountIds, setAccountIds] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState("");
  const [thumbnailMediaId, setThumbnailMediaId] = useState("");
  const [frameSourceId, setFrameSourceId] = useState("");
  const [shareToFeed, setShareToFeed] = useState(true);
  const [hideLikeCount, setHideLikeCount] = useState(false);
  const [publishMode, setPublishMode] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [timezone, setTimezone] = useState(getDefaultTimezone);
  const [accountSearch, setAccountSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [capturingThumb, setCapturingThumb] = useState(false);

  const [minDatetime] = useState(() =>
    toLocalDatetimeString(new Date(Date.now() + 6 * 60 * 1000)),
  );

  const mediaQuery = useQuery({ queryKey: ["media"], queryFn: listMedia });
  const accountsQuery = useQuery({ queryKey: ["social-accounts"], queryFn: listSocialAccounts });

  useEffect(() => {
    const fromQuery = searchParams.get("mediaIds");
    let ids: string[] = [];
    if (fromQuery) {
      ids = fromQuery.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      ids = readBatchMediaIds();
    }
    if (ids.length > 0) {
      setSelectedMediaIds([...new Set(ids)].slice(0, 20));
    }
  }, [searchParams]);

  const readyVideos = useMemo(
    () =>
      (mediaQuery.data?.media ?? []).filter(
        (m: MediaAsset) => m.type === "video" && m.status === "ready",
      ),
    [mediaQuery.data],
  );

  const readyImages = useMemo(
    () =>
      (mediaQuery.data?.media ?? []).filter(
        (m: MediaAsset) =>
          (m.type === "image" || m.type === "thumbnail") && m.status === "ready",
      ),
    [mediaQuery.data],
  );

  const selectedVideos = useMemo(
    () => readyVideos.filter((m) => selectedMediaIds.includes(m.id)),
    [readyVideos, selectedMediaIds],
  );

  const selectedThumb = readyImages.find((m) => m.id === thumbnailMediaId);

  const activeAccounts = useMemo(
    () => (accountsQuery.data ?? []).filter((a) => a.status === "active"),
    [accountsQuery.data],
  );

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    if (!q) return activeAccounts;
    return activeAccounts.filter((a) => accountLabel(a).toLowerCase().includes(q));
  }, [activeAccounts, accountSearch]);

  const igAccounts = filteredAccounts.filter((a) => a.platform === "instagram");
  const fbAccounts = filteredAccounts.filter((a) => a.platform === "facebook");
  const selectedAccounts = activeAccounts.filter((a) => accountIds.has(a.id));
  const igSelected = selectedAccounts.filter((a) => a.platform === "instagram").length;
  const fbSelected = selectedAccounts.filter((a) => a.platform === "facebook").length;

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

  function removeVideo(id: string) {
    setSelectedMediaIds((prev) => prev.filter((x) => x !== id));
  }

  function addVideo(id: string) {
    setSelectedMediaIds((prev) => (prev.includes(id) ? prev : [...prev, id].slice(0, 20)));
  }

  const publishMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        socialAccountIds: [...accountIds],
        caption: caption || undefined,
        thumbnailMediaId: thumbnailMediaId || undefined,
        options: {
          shareToFeed,
          hideLikeCount,
        },
        ...(publishMode === "scheduled" && scheduledAt
          ? {
              scheduledAt: new Date(scheduledAt).toISOString(),
              timezone,
            }
          : {}),
      };

      if (selectedMediaIds.length === 1) {
        return {
          mode: "single" as const,
          data: await createPost({ mediaId: selectedMediaIds[0]!, ...payload }),
        };
      }
      return {
        mode: "batch" as const,
        data: await createPostsBatch({ mediaIds: selectedMediaIds, ...payload }),
      };
    },
    onSuccess: (result) => {
      clearBatchMediaIds();
      if (result.mode === "single") {
        toast.success(
          publishMode === "scheduled"
            ? `Scheduled for ${result.data.destinations.length} destination(s)`
            : `Publishing to ${result.data.destinations.length} destination(s)`,
        );
        if (result.data.usedTemporaryUrl) {
          toast.message("Using temporary R2 URL — set R2_PUBLIC_URL for reliable Meta fetches");
        }
        router.push(`/posts/${result.data.post.id}`);
        return;
      }
      toast.success(
        publishMode === "scheduled"
          ? `Scheduled ${result.data.total} posts (${result.data.queuedDestinations} destinations)`
          : `Queued ${result.data.total} posts (${result.data.queuedDestinations} destinations). Publishing continues in the background.`,
      );
      router.push("/posts");
    },
    onError: (error: Error) => {
      toast.error(error.message);
      if (error instanceof PostsApiError && error.postId) {
        router.push(`/posts/${error.postId}`);
      }
    },
  });

  async function uploadCapturedThumb() {
    const source =
      selectedVideos.find((v) => v.id === frameSourceId) ?? selectedVideos[0];
    if (!source) {
      toast.error("Select a video first");
      return;
    }
    setCapturingThumb(true);
    try {
      const file = await captureFrameAsJpeg(source.publicUrl);
      const presign = await presignMedia({
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        type: "thumbnail",
      });
      await uploadToR2(presign.uploadUrl, file, file.type);
      const { media } = await completeMedia({
        r2Key: presign.r2Key,
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        type: "thumbnail",
      });
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      setThumbnailMediaId(media.id);
      toast.success("Thumbnail captured and selected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Thumbnail capture failed");
    } finally {
      setCapturingThumb(false);
    }
  }

  const canSubmit =
    selectedMediaIds.length > 0 &&
    accountIds.size > 0 &&
    !publishMutation.isPending &&
    (publishMode === "now" || Boolean(scheduledAt));

  const schedulePreview =
    publishMode === "scheduled" && scheduledAt
      ? new Date(scheduledAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  const unselectedReady = readyVideos.filter((m) => !selectedMediaIds.includes(m.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Post"
        description="Publish one or many videos with the same caption, thumbnail, and destinations. Jobs continue in the background if you leave this page."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>
                1. Selected videos ({selectedVideos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedVideos.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No videos selected.{" "}
                  <Link href="/media" className="underline underline-offset-4">
                    Pick from Media Library
                  </Link>{" "}
                  or add below.
                </p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {selectedVideos.map((m) => (
                    <div key={m.id} className="relative w-40 shrink-0">
                      <button
                        type="button"
                        className="bg-background absolute top-2 right-2 z-10 rounded-full border p-1 shadow"
                        onClick={() => removeVideo(m.id)}
                        aria-label={`Remove ${m.originalFilename}`}
                      >
                        <X className="size-3.5" />
                      </button>
                      <MediaPreview
                        publicUrl={m.publicUrl}
                        type={m.type}
                        filename={m.originalFilename}
                        fileSize={m.fileSize}
                      />
                    </div>
                  ))}
                </div>
              )}

              {unselectedReady.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">Add more ready videos</p>
                  <div className="flex flex-wrap gap-2">
                    {unselectedReady.slice(0, 12).map((m) => (
                      <Button
                        key={m.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addVideo(m.id)}
                      >
                        + {m.originalFilename.slice(0, 24)}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>2. Caption (same for all)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <textarea
                className="border-input bg-background min-h-28 w-full rounded-lg border px-3 py-2 text-sm"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption for this batch…"
                maxLength={2200}
              />
              <p className="text-muted-foreground text-right text-xs">{caption.length}/2200</p>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>3. Thumbnail (one for all videos)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-xs">
                Optional. Used as cover/thumb where Instagram/Facebook allow.
              </p>
              {selectedThumb ? (
                <div className="max-w-xs">
                  <MediaPreview
                    publicUrl={selectedThumb.publicUrl}
                    type={selectedThumb.type}
                    filename={selectedThumb.originalFilename}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setThumbnailMediaId("")}
                  >
                    Clear thumbnail
                  </Button>
                </div>
              ) : null}

              {readyImages.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  {readyImages.map((img) => (
                    <MediaPreview
                      key={img.id}
                      publicUrl={img.publicUrl}
                      type={img.type}
                      filename={img.originalFilename}
                      selected={thumbnailMediaId === img.id}
                      onSelect={() => setThumbnailMediaId(img.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  No images in library yet. Capture a frame from a selected video:
                </p>
              )}

              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1 space-y-1">
                  <Label htmlFor="frame-source">Capture frame from</Label>
                  <select
                    id="frame-source"
                    className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
                    value={frameSourceId || selectedVideos[0]?.id || ""}
                    onChange={(e) => setFrameSourceId(e.target.value)}
                  >
                    {selectedVideos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.originalFilename}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={capturingThumb || selectedVideos.length === 0}
                  onClick={() => void uploadCapturedThumb()}
                >
                  {capturingThumb ? "Capturing…" : "Use video frame"}
                </Button>
              </div>
              <video ref={frameVideoRef} className="hidden" muted playsInline />
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>4. Reach options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={shareToFeed}
                  onChange={(e) => setShareToFeed(e.target.checked)}
                />
                Share to Feed (Instagram Reels)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={hideLikeCount}
                  onChange={(e) => setHideLikeCount(e.target.checked)}
                />
                Hide like count (where platform allows)
              </label>
              <p className="text-muted-foreground text-xs">
                Unsupported options are skipped automatically during publish.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>5. Destinations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  className="h-9 pl-9"
                  placeholder="Search accounts"
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                />
              </div>
              {accountsQuery.isLoading ? (
                <p className="text-muted-foreground text-sm">Loading accounts…</p>
              ) : activeAccounts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No active accounts.{" "}
                  <Link href="/accounts" className="underline underline-offset-4">
                    Connect Instagram or Facebook
                  </Link>
                  .
                </p>
              ) : (
                <>
                  <AccountGroup
                    title="Instagram"
                    accounts={igAccounts}
                    selectedIds={accountIds}
                    onToggle={toggleAccount}
                    onToggleGroup={toggleGroup}
                  />
                  <AccountGroup
                    title="Facebook Pages"
                    accounts={fbAccounts}
                    selectedIds={accountIds}
                    onToggle={toggleAccount}
                    onToggleGroup={toggleGroup}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>6. When</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={publishMode === "now" ? "default" : "outline"}
                  onClick={() => setPublishMode("now")}
                >
                  Publish now
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={publishMode === "scheduled" ? "default" : "outline"}
                  onClick={() => setPublishMode("scheduled")}
                >
                  Schedule
                </Button>
              </div>
              {publishMode === "scheduled" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="scheduledAt">Date & time</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      min={minDatetime}
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      {[timezone, ...COMMON_TIMEZONES.filter((tz) => tz !== timezone)].map(
                        (tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="sticky top-20 shadow-none">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Videos </span>
                {selectedVideos.length || "None"}
              </p>
              <p>
                <span className="text-muted-foreground">Accounts </span>
                {accountIds.size} ({igSelected} IG · {fbSelected} FB)
              </p>
              <p>
                <span className="text-muted-foreground">Mode </span>
                {publishMode === "now" ? "Publish now" : `Schedule ${schedulePreview ?? "—"}`}
              </p>
              <p>
                <span className="text-muted-foreground">Thumbnail </span>
                {selectedThumb?.originalFilename ?? "Default"}
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Each video becomes its own post. Publishing runs in the background — you can close
                this page after submit.
              </p>
              <Button
                className="w-full"
                disabled={!canSubmit}
                onClick={() => setConfirmOpen(true)}
              >
                {publishMode === "scheduled"
                  ? `Schedule ${selectedVideos.length || ""} video${selectedVideos.length === 1 ? "" : "s"}`
                  : `Publish ${selectedVideos.length || ""} video${selectedVideos.length === 1 ? "" : "s"}`}
              </Button>
              <Link href="/media" className="text-muted-foreground block text-center text-xs underline">
                Back to Media Library
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background w-full max-w-md rounded-xl border p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Confirm publish</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Queue {selectedVideos.length} post{selectedVideos.length === 1 ? "" : "s"} to{" "}
              {accountIds.size} account{accountIds.size === 1 ? "" : "s"}
              {publishMode === "scheduled" && schedulePreview
                ? ` at ${schedulePreview}`
                : " now"}
              . Background workers keep going if you leave.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={publishMutation.isPending}
                onClick={() => {
                  setConfirmOpen(false);
                  publishMutation.mutate();
                }}
              >
                {publishMutation.isPending ? "Queuing…" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <AppShell title="Create Post">
      <Suspense fallback={<div className="text-muted-foreground p-6 text-sm">Loading…</div>}>
        <CreatePostContent />
      </Suspense>
    </AppShell>
  );
}
