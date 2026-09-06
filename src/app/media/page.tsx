"use client";

import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaPreview } from "@/components/shared/media-preview";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  bulkDeleteMedia,
  completeMedia,
  deleteMedia,
  formatBytes,
  listMedia,
  presignMedia,
  presignMediaBatch,
  uploadToR2,
  type MediaAsset,
} from "@/lib/media-api";

const MAX_BATCH_FILES = 20;
const UPLOAD_CONCURRENCY = 3;

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "completing" | "done" | "error";
  error?: string;
};

function mediaTypeForFile(file: File): "video" | "image" | undefined {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return undefined;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(runners);
}

function MediaLibraryContent() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const queryClient = useQueryClient();

  const mediaQuery = useQuery({
    queryKey: ["media"],
    queryFn: listMedia,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMedia,
    onSuccess: async () => {
      toast.success("Media deleted");
      await queryClient.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteMedia,
    onSuccess: async (result) => {
      toast.success(`Deleted ${result.deletedCount} item${result.deletedCount === 1 ? "" : "s"}`);
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const maxBytes = mediaQuery.data?.limits.maxUploadBytes ?? 524288000;

  const updateUpload = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const uploadOne = useCallback(
    async (
      item: UploadItem,
      presign?: {
        uploadUrl: string;
        r2Key: string;
        headers: { "Content-Type": string };
      },
    ) => {
      try {
        if (item.file.size > maxBytes) {
          updateUpload(item.id, {
            status: "error",
            error: `Exceeds max size (${formatBytes(maxBytes)})`,
          });
          return false;
        }

        updateUpload(item.id, { status: "uploading", progress: 0 });

        const type = mediaTypeForFile(item.file);
        const signed =
          presign ??
          (await presignMedia({
            originalFilename: item.file.name,
            mimeType: item.file.type || "application/octet-stream",
            fileSize: item.file.size,
            type,
          }));

        await uploadToR2(signed.uploadUrl, item.file, signed.headers["Content-Type"], (percent) => {
          updateUpload(item.id, { progress: percent, status: "uploading" });
        });

        updateUpload(item.id, { status: "completing", progress: 100 });

        await completeMedia({
          r2Key: signed.r2Key,
          originalFilename: item.file.name,
          mimeType: item.file.type,
          fileSize: item.file.size,
          type,
        });

        updateUpload(item.id, { status: "done", progress: 100 });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        updateUpload(item.id, { status: "error", error: message });
        return false;
      }
    },
    [maxBytes, updateUpload],
  );

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      let list = Array.from(files);
      if (list.length === 0) return;

      if (list.length > MAX_BATCH_FILES) {
        toast.message(`Only the first ${MAX_BATCH_FILES} files will be uploaded`);
        list = list.slice(0, MAX_BATCH_FILES);
      }

      const nextItems: UploadItem[] = list.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        progress: 0,
        status: "queued",
      }));

      setUploads((prev) => [...nextItems, ...prev]);
      setIsUploadingBatch(true);

      let ok = 0;
      let failed = 0;

      try {
        const filesPayload = nextItems.map((item) => ({
          originalFilename: item.file.name,
          mimeType: item.file.type || "application/octet-stream",
          fileSize: item.file.size,
          type: mediaTypeForFile(item.file),
        }));

        let presignByIndex = new Map<
          number,
          { uploadUrl: string; r2Key: string; headers: { "Content-Type": string } }
        >();

        if (nextItems.length >= 2) {
          try {
            const batch = await presignMediaBatch(filesPayload);
            for (const upload of batch.uploads) {
              presignByIndex.set(upload.clientIndex, {
                uploadUrl: upload.uploadUrl,
                r2Key: upload.r2Key,
                headers: upload.headers,
              });
            }
          } catch {
            // Fall back to per-file presign inside uploadOne
            presignByIndex = new Map();
          }
        }

        await runWithConcurrency(nextItems, UPLOAD_CONCURRENCY, async (item) => {
          const index = nextItems.findIndex((x) => x.id === item.id);
          const signed = index >= 0 ? presignByIndex.get(index) : undefined;
          const success = await uploadOne(item, signed);
          if (success) ok += 1;
          else failed += 1;
        });

        await queryClient.invalidateQueries({ queryKey: ["media"] });

        if (failed === 0) {
          toast.success(`Uploaded ${ok} file${ok === 1 ? "" : "s"}`);
        } else if (ok === 0) {
          toast.error(`All ${failed} uploads failed`);
        } else {
          toast.message(`Uploaded ${ok}, ${failed} failed`);
        }
      } finally {
        setIsUploadingBatch(false);
      }
    },
    [queryClient, uploadOne],
  );

  const retryFailed = useCallback(async () => {
    const failedItems = uploads.filter((u) => u.status === "error");
    if (failedItems.length === 0) return;

    setUploads((prev) =>
      prev.map((item) =>
        item.status === "error"
          ? { ...item, status: "queued", progress: 0, error: undefined }
          : item,
      ),
    );
    setIsUploadingBatch(true);

    let ok = 0;
    let failed = 0;
    try {
      await runWithConcurrency(failedItems, UPLOAD_CONCURRENCY, async (item) => {
        const success = await uploadOne({ ...item, status: "queued", progress: 0, error: undefined });
        if (success) ok += 1;
        else failed += 1;
      });
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      if (failed === 0) toast.success(`Retried ${ok} file${ok === 1 ? "" : "s"}`);
      else toast.message(`Retry: ${ok} ok, ${failed} still failing`);
    } finally {
      setIsUploadingBatch(false);
    }
  }, [queryClient, uploadOne, uploads]);

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((item) => item.status !== "done"));
  }, []);

  const media = mediaQuery.data?.media ?? [];
  const empty = !mediaQuery.isLoading && media.length === 0;

  const queueStats = useMemo(() => {
    const queued = uploads.filter((u) => u.status === "queued").length;
    const active = uploads.filter((u) => u.status === "uploading" || u.status === "completing").length;
    const done = uploads.filter((u) => u.status === "done").length;
    const error = uploads.filter((u) => u.status === "error").length;
    return { queued, active, done, error };
  }, [uploads]);

  const allSelected = media.length > 0 && selectedIds.size === media.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(media.map((m) => m.id)));
  }

  const dropHandlers = useMemo(
    () => ({
      onDragOver: (event: DragEvent) => {
        event.preventDefault();
        setDragOver(true);
      },
      onDragLeave: () => setDragOver(false),
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        setDragOver(false);
        void processFiles(event.dataTransfer.files);
      },
    }),
    [processFiles],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description={`Upload videos and images to Cloudflare R2. Up to ${MAX_BATCH_FILES} files at once (${UPLOAD_CONCURRENCY} concurrent). Max ${formatBytes(maxBytes)} each.`}
        actions={
          <Button type="button" disabled={isUploadingBatch} onClick={() => inputRef.current?.click()}>
            {isUploadingBatch ? "Uploading…" : "Upload Media"}
          </Button>
        }
      />

      <Card
        className={dragOver ? "border-primary border-dashed shadow-none" : "border-dashed shadow-none"}
        {...dropHandlers}
      >
        <CardHeader>
          <CardTitle>Upload</CardTitle>
          <CardDescription>
            Drag and drop files here, or browse. Supports MP4, MOV, JPEG, PNG, WebP.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) void processFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={isUploadingBatch} onClick={() => inputRef.current?.click()}>
              {isUploadingBatch ? "Uploading…" : "Choose files"}
            </Button>
            {queueStats.error > 0 && (
              <Button type="button" variant="outline" disabled={isUploadingBatch} onClick={() => void retryFailed()}>
                Retry failed ({queueStats.error})
              </Button>
            )}
            {queueStats.done > 0 && (
              <Button type="button" variant="outline" onClick={clearCompleted}>
                Clear completed
              </Button>
            )}
          </div>

          {uploads.length > 0 ? (
            <div className="w-full space-y-3">
              <p className="text-muted-foreground text-xs">
                Queued {queueStats.queued} · Active {queueStats.active} · Done {queueStats.done}
                {queueStats.error > 0 ? ` · Failed ${queueStats.error}` : ""}
              </p>
              <ul className="space-y-3">
                {uploads.map((item) => (
                  <li key={item.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.file.name}</p>
                        <p className="text-muted-foreground">{formatBytes(item.file.size)}</p>
                      </div>
                      <Badge variant={item.status === "error" ? "destructive" : "secondary"}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="bg-muted mt-2 h-2 overflow-hidden rounded">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    {item.error ? <p className="text-destructive mt-2">{item.error}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Library</CardTitle>
              <CardDescription>Assets available for publishing.</CardDescription>
            </div>
            {media.length > 0 && (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={toggleSelectAll}>
                  {allSelected ? "Deselect all" : "Select all"}
                </Button>
                {selectedIds.size > 0 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={bulkDeleteMutation.isPending}
                    onClick={() => {
                      if (confirm(`Delete ${selectedIds.size} selected item(s)?`)) {
                        bulkDeleteMutation.mutate([...selectedIds]);
                      }
                    }}
                  >
                    {bulkDeleteMutation.isPending
                      ? "Deleting…"
                      : `Delete selected (${selectedIds.size})`}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {mediaQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : null}

          {mediaQuery.isError ? (
            <p className="text-destructive text-sm">
              {mediaQuery.error instanceof Error
                ? mediaQuery.error.message
                : "Failed to load media"}
            </p>
          ) : null}

          {empty ? (
            <EmptyState
              title="No media yet"
              description="Upload your first video to start publishing."
              action={{
                label: "Upload Media",
                onClick: () => inputRef.current?.click(),
              }}
            />
          ) : null}

          {!empty ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {media.map((item: MediaAsset) => (
                <li key={item.id} className="relative">
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      className="bg-background h-4 w-4 rounded border shadow"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      aria-label={`Select ${item.originalFilename}`}
                    />
                  </div>
                  <MediaPreview
                    publicUrl={item.publicUrl}
                    type={item.type}
                    filename={item.originalFilename}
                    fileSize={item.fileSize}
                    selected={selectedIds.has(item.id)}
                  />
                  <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{item.type}</Badge>
                      <Badge variant={item.status === "ready" ? "default" : "secondary"}>
                        {item.status}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm(`Delete ${item.originalFilename}?`)) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MediaPage() {
  return (
    <AppShell title="Media Library">
      <MediaLibraryContent />
    </AppShell>
  );
}
