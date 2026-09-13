"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Link2,
  Loader2,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { AccountAvatar } from "@/components/shared/account-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { saveBatchMediaIds } from "@/lib/batch-media";
import { InstagramLinkImporter } from "@/components/shared/instagram-link-importer";
import {
  getImportJobs,
  importAccountMedia,
  importFromUrl,
  isImportTerminal,
  listAccountMedia,
  listImportSources,
  previewImportUrl,
  retryImportJob,
  type ExternalMediaItem,
  type ImportJob,
  type ImportSourceAccount,
} from "@/lib/import-api";
import { accountLabel, type SocialAccount } from "@/lib/social-api";
import { cn } from "@/lib/utils";

type SourceMode = "account" | "url" | "instagram";

function formatDate(value?: string): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatDuration(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ImportContentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<SourceMode>("account");
  const [platformFilter, setPlatformFilter] = useState<"all" | "instagram" | "facebook">("all");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [items, setItems] = useState<ExternalMediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [selectedExternalIds, setSelectedExternalIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaErrorCode, setMediaErrorCode] = useState<string | undefined>();
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlAccountId, setUrlAccountId] = useState<string>("");
  const [urlPreview, setUrlPreview] = useState<{
    mediaType: string;
    mimeType?: string;
    filename?: string;
    thumbnailUrl?: string;
    caption?: string;
    platform?: string;
    shortcode?: string;
    accountLabel?: string;
    alreadyImported?: boolean;
    socialAccountId?: string;
  } | null>(null);
  const [instagramImportedIds, setInstagramImportedIds] = useState<string[]>([]);


  const sourcesQuery = useQuery({
    queryKey: ["import-sources"],
    queryFn: listImportSources,
  });

  const accounts = useMemo(() => {
    const list = sourcesQuery.data?.accounts ?? [];
    if (platformFilter === "all") return list;
    return list.filter((a) => a.platform === platformFilter);
  }, [sourcesQuery.data, platformFilter]);

  const activeAccounts = accounts.filter((a) => a.status === "active");
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.caption?.toLowerCase().includes(q) ||
        item.externalId.toLowerCase().includes(q) ||
        item.mediaType.toLowerCase().includes(q),
    );
  }, [items, search]);

  const selectableIds = filteredItems
    .filter((item) => !item.alreadyImported)
    .map((item) => item.externalId);
  const allSelectableSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedExternalIds.has(id));

  const loadMedia = useCallback(
    async (accountId: string, cursor?: string, append = false) => {
      setLoadingMedia(true);
      setMediaError(null);
      setMediaErrorCode(undefined);
      try {
        const data = await listAccountMedia(accountId, { limit: 10, cursor });
        setItems((prev) => {
          if (!append) return data.items;
          const seen = new Set(prev.map((i) => i.externalId));
          const merged = [...prev];
          for (const item of data.items) {
            if (!seen.has(item.externalId)) merged.push(item);
          }
          return merged;
        });
        setNextCursor(data.nextCursor);
        if (!append) setSelectedExternalIds(new Set());
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load media";
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code)
            : undefined;
        setMediaError(message);
        setMediaErrorCode(code);
        if (!append) {
          setItems([]);
          setNextCursor(undefined);
        }
      } finally {
        setLoadingMedia(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedAccountId) {
      setItems([]);
      setNextCursor(undefined);
      return;
    }
    void loadMedia(selectedAccountId);
  }, [selectedAccountId, loadMedia]);

  // Poll active import jobs
  useEffect(() => {
    const activeIds = importJobs.filter((j) => !isImportTerminal(j.status)).map((j) => j.id);
    if (activeIds.length === 0) return;

    const timer = setInterval(() => {
      void (async () => {
        try {
          const { jobs } = await getImportJobs(importJobs.map((j) => j.id));
          setImportJobs(jobs);
          const done = jobs.filter(
            (j) => j.status === "completed" || j.status === "already_imported",
          );
          if (done.length > 0) {
            await queryClient.invalidateQueries({ queryKey: ["media"] });
          }
        } catch {
          // ignore transient poll errors
        }
      })();
    }, 2000);

    return () => clearInterval(timer);
  }, [importJobs, queryClient]);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAccountId) throw new Error("Select an account");
      const ids = [...selectedExternalIds];
      if (ids.length === 0) throw new Error("Select at least one item");
      return importAccountMedia(selectedAccountId, ids);
    },
    onSuccess: (data) => {
      setImportJobs((prev) => {
        const map = new Map(prev.map((j) => [j.id, j]));
        for (const job of data.jobs) map.set(job.id, job);
        return [...map.values()];
      });
      setSelectedExternalIds(new Set());
      toast.success(`Started importing ${data.jobs.length} item${data.jobs.length === 1 ? "" : "s"}`);
      // Refresh list so alreadyImported flags update after completion via poll
      if (selectedAccountId) void loadMedia(selectedAccountId);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const urlPreviewMutation = useMutation({
    mutationFn: () =>
      previewImportUrl(urlInput.trim(), {
        socialAccountId: urlAccountId || undefined,
      }),
    onSuccess: (data) => {
      setUrlPreview(data.preview);
      if (data.preview.socialAccountId) {
        setUrlAccountId(data.preview.socialAccountId);
      }
      toast.success(
        data.adapter === "instagram-permalink"
          ? "Matched reel on your connected Instagram account"
          : "URL looks importable",
      );
    },
    onError: (error: Error) => {
      setUrlPreview(null);
      toast.error(error.message);
    },
  });

  const urlImportMutation = useMutation({
    mutationFn: () =>
      importFromUrl(urlInput.trim(), {
        socialAccountId: urlAccountId || urlPreview?.socialAccountId || undefined,
      }),
    onSuccess: (data) => {
      setImportJobs((prev) => {
        const map = new Map(prev.map((j) => [j.id, j]));
        for (const job of data.jobs) map.set(job.id, job);
        return [...map.values()];
      });
      toast.success("URL import started");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => retryImportJob(id),
    onSuccess: (data) => {
      setImportJobs((prev) => prev.map((j) => (j.id === data.job.id ? data.job : j)));
      toast.success("Retry queued");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const importedMediaIds = useMemo(
    () =>
      importJobs
        .filter((j) => (j.status === "completed" || j.status === "already_imported") && j.mediaAssetId)
        .map((j) => j.mediaAssetId!)
        .filter((id, index, arr) => arr.indexOf(id) === index),
    [importJobs],
  );

  const completedCount = importJobs.filter((j) => j.status === "completed").length;
  const alreadyCount = importJobs.filter((j) => j.status === "already_imported").length;
  const failedCount = importJobs.filter((j) => j.status === "failed").length;
  const inFlight = importJobs.some((j) => !isImportTerminal(j.status));

  function toggleSelect(id: string) {
    setSelectedExternalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelectableSelected) {
      setSelectedExternalIds(new Set());
      return;
    }
    setSelectedExternalIds(new Set(selectableIds));
  }

  function goCreatePost() {
    if (importedMediaIds.length === 0) {
      toast.error("No imported media yet");
      return;
    }
    saveBatchMediaIds(importedMediaIds);
    router.push(`/create-post?mediaIds=${importedMediaIds.join(",")}`);
  }

  const noAccounts = !sourcesQuery.isLoading && activeAccounts.length === 0;

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Import Content"
        description="Import your own media from connected Instagram or Facebook accounts, or from a direct media URL. Batches of 10."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/media" className={buttonVariants({ variant: "outline" })}>
              <Upload className="size-4" />
              Upload Media
            </Link>
            <Link href="/media" className={buttonVariants({ variant: "outline" })}>
              Go to Media Library
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "account" ? "default" : "outline"}
          onClick={() => setMode("account")}
        >
          <Users className="size-4" />
          Import from Connected Account
        </Button>
        <Button
          type="button"
          variant={mode === "url" ? "default" : "outline"}
          onClick={() => setMode("url")}
        >
          <Link2 className="size-4" />
          Import from URL
        </Button>
        <Button
          type="button"
          variant={mode === "instagram" ? "default" : "outline"}
          onClick={() => setMode("instagram")}
        >
          <Download className="size-4" />
          Import Instagram Link
        </Button>
        <Link href="/media" className={buttonVariants({ variant: "outline" })}>
          <Upload className="size-4" />
          Upload Media
        </Link>
      </div>

      {mode === "instagram" ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Import Instagram public link</CardTitle>
            <CardDescription>
              Paste a public Instagram link, preview it, choose accounts, then upload — download and
              publish happen on this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InstagramLinkImporter
              onComplete={(result) => {
                setInstagramImportedIds(result.mediaIds);
                saveBatchMediaIds(result.mediaIds);
              }}
              onViewLibrary={() => router.push("/media")}
            />
            {instagramImportedIds.length > 0 ? (
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    saveBatchMediaIds(instagramImportedIds);
                    router.push(`/create-post?mediaIds=${instagramImportedIds.join(",")}`);
                  }}
                >
                  Open in Create Post ({instagramImportedIds.length})
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {mode === "url" ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Import from URL</CardTitle>
            <CardDescription>
              Paste an Instagram reel/post link from one of your connected accounts, or a direct
              media file URL (mp4, mov, jpeg, png, webp). For any public Instagram link, use
              “Import Instagram Link” instead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-url">Reel or media URL</Label>
              <Input
                id="import-url"
                placeholder="https://www.instagram.com/reel/SHORTCODE/ or https://cdn.example.com/video.mp4"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUrlPreview(null);
                }}
              />
            </div>

            {activeAccounts.filter((a) => a.platform === "instagram").length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="url-account">Instagram account (optional, speeds up lookup)</Label>
                <select
                  id="url-account"
                  className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
                  value={urlAccountId}
                  onChange={(e) => setUrlAccountId(e.target.value)}
                >
                  <option value="">Auto-detect across connected accounts</option>
                  {activeAccounts
                    .filter((a) => a.platform === "instagram")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {accountLabel(a as SocialAccount)}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No Instagram account connected.{" "}
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => router.push("/accounts")}
                >
                  Connect Instagram
                </button>{" "}
                to import reel links.
              </p>
            )}

            {urlPreview ? (
              <div className="space-y-3 rounded-lg border p-3 text-sm">
                {urlPreview.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlPreview.thumbnailUrl}
                    alt=""
                    className="aspect-video w-full max-w-sm rounded-lg object-cover"
                  />
                ) : null}
                <p>
                  <span className="text-muted-foreground">Type:</span> {urlPreview.mediaType}
                </p>
                {urlPreview.accountLabel ? (
                  <p>
                    <span className="text-muted-foreground">Account:</span> {urlPreview.accountLabel}
                  </p>
                ) : null}
                {urlPreview.shortcode ? (
                  <p>
                    <span className="text-muted-foreground">Shortcode:</span> {urlPreview.shortcode}
                  </p>
                ) : null}
                {urlPreview.mimeType ? (
                  <p>
                    <span className="text-muted-foreground">MIME:</span> {urlPreview.mimeType}
                  </p>
                ) : null}
                {urlPreview.caption ? (
                  <p className="line-clamp-3">
                    <span className="text-muted-foreground">Caption:</span> {urlPreview.caption}
                  </p>
                ) : null}
                {urlPreview.alreadyImported ? (
                  <Badge variant="secondary">Already imported</Badge>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!urlInput.trim() || urlPreviewMutation.isPending}
                onClick={() => urlPreviewMutation.mutate()}
              >
                {urlPreviewMutation.isPending ? "Looking up…" : "Preview"}
              </Button>
              <Button
                type="button"
                disabled={!urlInput.trim() || urlImportMutation.isPending}
                onClick={() => urlImportMutation.mutate()}
              >
                {urlImportMutation.isPending ? "Importing…" : "Import URL"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : mode === "account" ? (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <Card className="h-fit shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Source</CardTitle>
              <CardDescription>Choose platform and account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {(["all", "instagram", "facebook"] as const).map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={platformFilter === p ? "default" : "outline"}
                    onClick={() => {
                      setPlatformFilter(p);
                      setSelectedAccountId("");
                    }}
                  >
                    {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </div>

              {sourcesQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : null}

              {noAccounts ? (
                <EmptyState
                  title="No connected accounts"
                  description="Connect an Instagram or Facebook account to import content."
                  action={{
                    label: "Connect accounts",
                    onClick: () => router.push("/accounts"),
                  }}
                />
              ) : (
                <ul className="space-y-2">
                  {accounts.map((account: ImportSourceAccount) => (
                    <li key={account.id}>
                      <button
                        type="button"
                        disabled={account.status !== "active"}
                        onClick={() => setSelectedAccountId(account.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                          selectedAccountId === account.id
                            ? "border-primary/40 bg-accent/40"
                            : "hover:bg-muted/40",
                          account.status !== "active" && "opacity-60",
                        )}
                      >
                        <AccountAvatar account={account as SocialAccount} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {accountLabel(account as SocialAccount)}
                          </span>
                          <span className="text-muted-foreground text-xs capitalize">
                            {account.platform} · {account.status}
                          </span>
                        </span>
                        <PlatformIcon platform={account.platform} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Media browser</CardTitle>
                  <CardDescription>
                    {selectedAccount
                      ? `Latest media from ${accountLabel(selectedAccount as SocialAccount)} · batches of 10`
                      : "Select a connected account to browse media"}
                  </CardDescription>
                </div>
                {items.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={toggleSelectAll}>
                      {allSelectableSelected ? "Deselect all" : "Select all"}
                    </Button>
                    <Input
                      className="h-8 w-40"
                      placeholder="Search…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedAccountId ? (
                <EmptyState
                  title="Choose a source account"
                  description="Pick Instagram or Facebook on the left to load the latest 10 items."
                />
              ) : null}

              {mediaError ? (
                <EmptyState
                  title={
                    mediaErrorCode === "IMPORT_PERMISSION_REQUIRED"
                      ? "Permission required"
                      : mediaErrorCode === "IMPORT_TOKEN_EXPIRED"
                        ? "Reconnect required"
                        : "Could not load media"
                  }
                  description={
                    mediaErrorCode === "IMPORT_PERMISSION_REQUIRED"
                      ? "Reconnect this account to grant the required permission."
                      : mediaError
                  }
                  action={
                    mediaErrorCode === "IMPORT_PERMISSION_REQUIRED" ||
                    mediaErrorCode === "IMPORT_TOKEN_EXPIRED"
                      ? {
                          label: "Reconnect account",
                          onClick: () => router.push("/accounts"),
                        }
                      : {
                          label: "Retry",
                          onClick: () => void loadMedia(selectedAccountId),
                        }
                  }
                />
              ) : null}

              {loadingMedia && items.length === 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-video w-full rounded-xl" />
                  ))}
                </div>
              ) : null}

              {!loadingMedia && !mediaError && selectedAccountId && filteredItems.length === 0 ? (
                <EmptyState
                  title="No importable media found"
                  description="This account has no media available through the official API, or the batch is empty."
                />
              ) : null}

              {filteredItems.length > 0 ? (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredItems.map((item) => {
                    const checked = selectedExternalIds.has(item.externalId);
                    return (
                      <li key={item.externalId}>
                        <label
                          className={cn(
                            "block cursor-pointer overflow-hidden rounded-xl border transition-colors",
                            checked ? "border-primary/50 ring-1 ring-primary/30" : "hover:bg-muted/20",
                            item.alreadyImported && "opacity-80",
                          )}
                        >
                          <div className="bg-muted relative aspect-video">
                            {item.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.thumbnailUrl}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="text-muted-foreground flex size-full items-center justify-center text-xs">
                                No thumbnail
                              </div>
                            )}
                            <div className="absolute top-2 left-2 flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="bg-background size-4 rounded border shadow"
                                checked={checked}
                                disabled={item.alreadyImported}
                                onChange={() => toggleSelect(item.externalId)}
                              />
                            </div>
                            <div className="absolute top-2 right-2">
                              <PlatformIcon platform={item.platform} />
                            </div>
                          </div>
                          <div className="space-y-1.5 p-3">
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="outline">{item.mediaType}</Badge>
                              {item.alreadyImported ? (
                                <Badge variant="secondary">Already imported</Badge>
                              ) : null}
                              {item.duration ? (
                                <Badge variant="secondary">{formatDuration(item.duration)}</Badge>
                              ) : null}
                            </div>
                            <p className="line-clamp-2 text-sm">
                              {item.caption?.trim() || "No caption"}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {formatDate(item.createdAt)}
                              {selectedAccount
                                ? ` · ${accountLabel(selectedAccount as SocialAccount)}`
                                : ""}
                            </p>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {selectedAccountId && (nextCursor || items.length > 0) ? (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <p className="text-muted-foreground text-sm">
                    Showing {items.length} item{items.length === 1 ? "" : "s"}
                    {nextCursor ? " · more available" : " · end of list"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {nextCursor ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={loadingMedia}
                        onClick={() => void loadMedia(selectedAccountId, nextCursor, true)}
                      >
                        {loadingMedia ? "Loading…" : "Load next 10"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {importJobs.length > 0 && mode !== "instagram" ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Import status</CardTitle>
            <CardDescription>
              Imported {completedCount}
              {alreadyCount ? ` · Already imported ${alreadyCount}` : ""}
              {failedCount ? ` · Failed ${failedCount}` : ""}
              {inFlight ? " · In progress…" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2">
              {importJobs.map((job, index) => (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {job.externalId
                        ? `Item ${index + 1} · ${job.externalId.slice(0, 12)}…`
                        : `Item ${index + 1}`}
                    </p>
                    {job.errorMessage ? (
                      <p className="text-destructive text-xs">{job.errorMessage}</p>
                    ) : job.caption ? (
                      <p className="text-muted-foreground line-clamp-1 text-xs">{job.caption}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={job.status} />
                    {job.status === "failed" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={retryMutation.isPending}
                        onClick={() => retryMutation.mutate(job.id)}
                      >
                        Retry
                      </Button>
                    ) : null}
                    {!isImportTerminal(job.status) ? (
                      <Loader2 className="text-muted-foreground size-4 animate-spin" />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2 pt-2">
              {nextCursor && mode === "account" && selectedAccountId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadMedia(selectedAccountId, nextCursor, true)}
                >
                  Load next 10
                </Button>
              ) : null}
              <Link href="/media" className={buttonVariants({ variant: "outline" })}>
                Go to Media Library
              </Link>
              {importedMediaIds.length > 0 ? (
                <Button type="button" onClick={goCreatePost}>
                  Create Post with Imported Media ({importedMediaIds.length})
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {mode === "account" && selectedExternalIds.size > 0 ? (
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur">
          <p className="text-sm font-medium">
            {selectedExternalIds.size} selected
          </p>
          <Button
            type="button"
            disabled={importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            <Download className="size-4" />
            {importMutation.isPending ? "Importing…" : "Import Selected"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function MediaImportPage() {
  return (
    <AppShell title="Import Content">
      <ImportContentPage />
    </AppShell>
  );
}
