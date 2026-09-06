"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { MediaPreview } from "@/components/shared/media-preview";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listMedia } from "@/lib/media-api";
import {
  cancelPost,
  getPost,
  getPostMetrics,
  refreshPostMetrics,
  retryPost,
  type DestinationStatus,
  type PostMetrics,
} from "@/lib/posts-api";

const IN_PROGRESS: DestinationStatus[] = [
  "pending",
  "queued",
  "publishing",
  "processing",
  "uploading",
  "processing_media",
  "ready_to_publish",
];

function isInProgress(status: DestinationStatus) {
  return IN_PROGRESS.includes(status);
}

function isCancellable(status: DestinationStatus) {
  return status === "pending" || status === "queued";
}

function isRetriable(status: DestinationStatus) {
  return status === "failed";
}

function hasPublishedDestinations(status: string) {
  return status === "published" || status === "partially_published";
}

function PostDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["posts", id],
    queryFn: () => getPost(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return false;
      return d.destinations.some((dest) => isInProgress(dest.status)) ? 3000 : false;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelPost(id),
    onSuccess: () => {
      toast.success("Post cancelled");
      void queryClient.invalidateQueries({ queryKey: ["posts", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const metricsQuery = useQuery({
    queryKey: ["posts", id, "metrics"],
    queryFn: () => getPostMetrics(id),
    enabled: Boolean(id) && hasPublishedDestinations(data?.post.status ?? ""),
  });

  const mediaQuery = useQuery({
    queryKey: ["media"],
    queryFn: listMedia,
    enabled: Boolean(data?.post.mediaId),
  });

  const postMedia = mediaQuery.data?.media.find((m) => m.id === data?.post.mediaId);

  const refreshMetricsMutation = useMutation({
    mutationFn: () => refreshPostMetrics(id),
    onSuccess: (result) => {
      queryClient.setQueryData(["posts", id, "metrics"], result);
      toast.success("Metrics refreshed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const retryAllMutation = useMutation({
    mutationFn: () => retryPost(id),
    onSuccess: (result) => {
      toast.success(
        `Retrying ${result.retriedCount} destination${result.retriedCount === 1 ? "" : "s"}`,
      );
      void queryClient.invalidateQueries({ queryKey: ["posts", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const retryOneMutation = useMutation({
    mutationFn: (destinationId: string) => retryPost(id, [destinationId]),
    onSuccess: () => {
      toast.success("Retry queued");
      void queryClient.invalidateQueries({ queryKey: ["posts", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const hasCancellable =
    data?.destinations.some((d) => isCancellable(d.status)) ?? false;
  const failedDestinations =
    data?.destinations.filter((d) => isRetriable(d.status)) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground font-mono text-xs">{id}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Post detail</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {failedDestinations.length > 0 ? (
            <Button
              variant="secondary"
              disabled={retryAllMutation.isPending}
              onClick={() => retryAllMutation.mutate()}
            >
              {retryAllMutation.isPending
                ? "Retrying…"
                : `Retry failed (${failedDestinations.length})`}
            </Button>
          ) : null}
          {hasCancellable ? (
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => {
                if (confirm("Cancel pending destinations?")) cancelMutation.mutate();
              }}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel"}
            </Button>
          ) : null}
          <Link href="/posts">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-40 w-full rounded-xl" /> : null}
      {error ? (
        <p className="text-destructive text-sm">
          {error instanceof Error ? error.message : "Failed to load post"}
        </p>
      ) : null}

      {data ? (
        <>
          {postMedia ? (
            <MediaPreview
              variant="inline"
              publicUrl={postMedia.publicUrl}
              type={postMedia.type}
              filename={postMedia.originalFilename}
              fileSize={postMedia.fileSize}
              className="max-w-xl"
            />
          ) : null}

          <Card className="shadow-none">
            <CardContent className="grid gap-3 pt-1 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Status </span>
                <StatusBadge status={data.post.status} />
              </p>
              <p>
                <span className="text-muted-foreground">Mode </span>
                <span className="capitalize">{data.post.publishMode}</span>
              </p>
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Caption </span>
                {data.post.caption || "(empty)"}
              </p>
              {data.post.scheduledAt ? (
                <p className="sm:col-span-2">
                  <span className="text-muted-foreground">Scheduled </span>
                  {new Date(data.post.scheduledAt).toLocaleString()} ({data.post.timezone})
                </p>
              ) : null}
              <p>
                <span className="text-muted-foreground">Created </span>
                {new Date(data.post.createdAt).toLocaleString()}
              </p>
              <p>
                <span className="text-muted-foreground">Destinations </span>
                {data.post.successfulDestinations}/{data.post.totalDestinations} succeeded
                {data.post.failedDestinations > 0
                  ? `, ${data.post.failedDestinations} failed`
                  : ""}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Publishing destinations</CardTitle>
              {data.destinations.some((d) => isInProgress(d.status)) ? (
                <span className="text-muted-foreground animate-pulse text-xs">
                  Publishing… auto-refreshing
                </span>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {data.destinations.map((d) => (
                <div
                  key={d.id}
                  className={`rounded-xl border p-4 text-sm ${
                    d.status === "failed" ? "border-red-200 bg-red-50/40 dark:bg-red-950/20" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={d.platform} />
                      <span className="capitalize font-medium">{d.platform}</span>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                  {d.platformPostId ? (
                    <p className="text-muted-foreground mt-2 font-mono text-xs">
                      Post ID: {d.platformPostId}
                    </p>
                  ) : null}
                  {d.platformPostUrl ? (
                    <a
                      href={d.platformPostUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary mt-1 inline-block text-xs underline underline-offset-2"
                    >
                      Open on {d.platform}
                    </a>
                  ) : null}
                  {d.publishedAt ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Published {new Date(d.publishedAt).toLocaleString()}
                    </p>
                  ) : null}
                  {d.lastError ? (
                    <p className="text-destructive mt-2 text-xs">
                      {d.lastErrorCode ? `[${d.lastErrorCode}] ` : ""}
                      {d.lastError}
                    </p>
                  ) : null}
                  {isRetriable(d.status) ? (
                    <Button
                      className="mt-3"
                      variant="outline"
                      size="sm"
                      disabled={retryOneMutation.isPending}
                      onClick={() => retryOneMutation.mutate(d.id)}
                    >
                      Retry
                    </Button>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          {hasPublishedDestinations(data.post.status) ? (
            <Card className="shadow-none">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Engagement metrics</CardTitle>
                <button
                  type="button"
                  disabled={refreshMetricsMutation.isPending}
                  onClick={() => refreshMetricsMutation.mutate()}
                  className="text-muted-foreground text-xs underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {refreshMetricsMutation.isPending ? "Refreshing…" : "Refresh now"}
                </button>
              </CardHeader>
              <CardContent>
                {metricsQuery.isLoading ? (
                  <p className="text-muted-foreground text-sm">Loading metrics…</p>
                ) : null}
                {!metricsQuery.isLoading && (metricsQuery.data?.metrics ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No metrics yet — fetched ~5 min after publishing, or refresh now.
                  </p>
                ) : null}
                <ul className="space-y-3">
                  {(metricsQuery.data?.metrics ?? []).map((m: PostMetrics) => (
                    <li key={m.id} className="space-y-3 rounded-xl border p-4 text-sm">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={m.platform} />
                        <span className="capitalize font-medium">{m.platform}</span>
                        {m.fetchedAt ? (
                          <span className="text-muted-foreground text-xs">
                            · {new Date(m.fetchedAt).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {[
                          { label: "Views", value: m.views },
                          { label: "Likes", value: m.likes },
                          { label: "Comments", value: m.comments },
                          { label: "Reach", value: m.reach },
                          { label: "Shares", value: m.shares },
                        ].map(({ label, value }) => (
                          <div
                            key={label}
                            className="rounded-lg bg-muted/40 px-3 py-2 text-center"
                          >
                            <p className="text-lg font-semibold">
                              {value != null ? value.toLocaleString() : "—"}
                            </p>
                            <p className="text-muted-foreground text-xs">{label}</p>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function PostDetailPage() {
  return (
    <AppShell title="Post detail">
      <PostDetailContent />
    </AppShell>
  );
}
