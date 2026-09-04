"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { AccountAvatar } from "@/components/shared/account-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listMedia, formatBytes, type MediaAsset } from "@/lib/media-api";
import { createPost, PostsApiError } from "@/lib/posts-api";
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
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {title}
        </p>
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

function CreatePostContent() {
  const router = useRouter();
  const [mediaId, setMediaId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState("");
  const [publishMode, setPublishMode] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [timezone, setTimezone] = useState(getDefaultTimezone);
  const [accountSearch, setAccountSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [minDatetime] = useState(() =>
    toLocalDatetimeString(new Date(Date.now() + 6 * 60 * 1000)),
  );

  const mediaQuery = useQuery({ queryKey: ["media"], queryFn: listMedia });
  const accountsQuery = useQuery({ queryKey: ["social-accounts"], queryFn: listSocialAccounts });

  const readyVideos = useMemo(
    () =>
      (mediaQuery.data?.media ?? []).filter(
        (m: MediaAsset) => m.type === "video" && m.status === "ready",
      ),
    [mediaQuery.data],
  );

  const selectedMedia = readyVideos.find((m) => m.id === mediaId);

  const activeAccounts = useMemo(
    () => (accountsQuery.data ?? []).filter((a) => a.status === "active"),
    [accountsQuery.data],
  );

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    if (!q) return activeAccounts;
    return activeAccounts.filter((a) =>
      accountLabel(a).toLowerCase().includes(q),
    );
  }, [activeAccounts, accountSearch]);

  const igAccounts = filteredAccounts.filter((a) => a.platform === "instagram");
  const fbAccounts = filteredAccounts.filter((a) => a.platform === "facebook");

  const selectedAccounts = activeAccounts.filter((a) => selectedIds.has(a.id));
  const igSelected = selectedAccounts.filter((a) => a.platform === "instagram").length;
  const fbSelected = selectedAccounts.filter((a) => a.platform === "facebook").length;

  function toggleAccount(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(accounts: SocialAccount[]) {
    const ids = accounts.map((a) => a.id);
    const allOn = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  const publishMutation = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof createPost>[0] = {
        mediaId,
        socialAccountIds: [...selectedIds],
        caption: caption || undefined,
      };
      if (publishMode === "scheduled" && scheduledAt) {
        payload.scheduledAt = new Date(scheduledAt).toISOString();
        payload.timezone = timezone;
      }
      return createPost(payload);
    },
    onSuccess: (data) => {
      toast.success(
        publishMode === "scheduled"
          ? `Scheduled for ${data.destinations.length} destination${data.destinations.length === 1 ? "" : "s"}`
          : `Publishing to ${data.destinations.length} destination${data.destinations.length === 1 ? "" : "s"}`,
      );
      if (data.usedTemporaryUrl) {
        toast.message("Using temporary R2 URL — set R2_PUBLIC_URL for reliable Meta fetches");
      }
      router.push(`/posts/${data.post.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      if (error instanceof PostsApiError && error.postId) {
        router.push(`/posts/${error.postId}`);
      }
    },
  });

  const canSubmit =
    Boolean(mediaId) &&
    selectedIds.size > 0 &&
    !publishMutation.isPending &&
    (publishMode === "now" || Boolean(scheduledAt));

  const schedulePreview =
    publishMode === "scheduled" && scheduledAt
      ? new Date(scheduledAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Post"
        description="Upload content and publish it across your connected accounts."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>1. Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="media">Ready video</Label>
              <select
                id="media"
                className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                value={mediaId}
                onChange={(e) => setMediaId(e.target.value)}
                disabled={mediaQuery.isLoading}
              >
                <option value="">Select a ready video…</option>
                {readyVideos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.originalFilename} ({formatBytes(m.fileSize)})
                  </option>
                ))}
              </select>
              {selectedMedia ? (
                <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">{selectedMedia.originalFilename}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatBytes(selectedMedia.fileSize)} · {selectedMedia.mimeType}
                  </p>
                </div>
              ) : null}
              {readyVideos.length === 0 && !mediaQuery.isLoading ? (
                <p className="text-muted-foreground text-xs">
                  No ready videos.{" "}
                  <Link href="/media" className="underline underline-offset-4">
                    Upload in Media Library
                  </Link>
                  .
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>2. Caption</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <textarea
                className="border-input bg-background min-h-28 w-full rounded-lg border px-3 py-2 text-sm"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption for this post…"
                maxLength={2200}
              />
              <p className="text-muted-foreground text-right text-xs">{caption.length}/2200</p>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>3. Destinations</CardTitle>
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
                    selectedIds={selectedIds}
                    onToggle={toggleAccount}
                    onToggleGroup={toggleGroup}
                  />
                  <AccountGroup
                    title="Facebook Pages"
                    accounts={fbAccounts}
                    selectedIds={selectedIds}
                    onToggle={toggleAccount}
                    onToggleGroup={toggleGroup}
                  />
                </>
              )}
              <p className="text-muted-foreground sticky bottom-0 rounded-lg border bg-card px-3 py-2 text-xs">
                {selectedIds.size} account{selectedIds.size === 1 ? "" : "s"} selected
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>4. Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
                {(["now", "scheduled"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPublishMode(mode)}
                    className={cn(
                      "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      publishMode === mode
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground",
                    )}
                  >
                    {mode === "now" ? "Publish now" : "Schedule"}
                  </button>
                ))}
              </div>
              {publishMode === "now" ? (
                <p className="text-muted-foreground text-sm">
                  Destinations will be queued and published as soon as the worker is available.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledAt">Date & time</Label>
                    <Input
                      type="datetime-local"
                      id="scheduledAt"
                      className="h-10"
                      value={scheduledAt}
                      min={minDatetime}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                      {!COMMON_TIMEZONES.includes(timezone) ? (
                        <option value={timezone}>{timezone}</option>
                      ) : null}
                    </select>
                  </div>
                  {schedulePreview ? (
                    <p className="text-muted-foreground sm:col-span-2 text-sm">
                      Will publish around {schedulePreview} ({timezone})
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="sticky top-20 shadow-none">
            <CardHeader>
              <CardTitle>Post summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Media</span>
                  <span>{selectedMedia ? selectedMedia.originalFilename : "Not selected"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Destinations</span>
                  <span>{selectedIds.size} accounts</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Instagram</span>
                  <span>{igSelected}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Facebook</span>
                  <span>{fbSelected}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Publishing</span>
                  <span className="capitalize">{publishMode === "now" ? "Now" : "Scheduled"}</span>
                </div>
                {schedulePreview ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">When</span>
                    <span className="text-right">{schedulePreview}</span>
                  </div>
                ) : null}
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!canSubmit}
                onClick={() => {
                  if (selectedIds.size >= 5) setConfirmOpen(true);
                  else publishMutation.mutate();
                }}
              >
                {publishMutation.isPending
                  ? "Submitting…"
                  : publishMode === "scheduled"
                    ? `Schedule to ${selectedIds.size || "…"} account${selectedIds.size === 1 ? "" : "s"}`
                    : `Publish to ${selectedIds.size || "…"} account${selectedIds.size === 1 ? "" : "s"}`}
              </Button>
              {!canSubmit ? (
                <p className="text-muted-foreground text-xs">
                  Select a video and at least one account
                  {publishMode === "scheduled" ? ", and a schedule time" : ""}.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              {publishMode === "scheduled" ? "Schedule this post?" : "Publish this post?"}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              This will create {selectedIds.size} publishing destination
              {selectedIds.size === 1 ? "" : "s"}
              {publishMode === "scheduled" && schedulePreview
                ? ` for ${schedulePreview}`
                : ""}.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setConfirmOpen(false);
                  publishMutation.mutate();
                }}
              >
                Confirm
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
      <CreatePostContent />
    </AppShell>
  );
}
