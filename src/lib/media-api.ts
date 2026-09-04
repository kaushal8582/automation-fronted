import { API_BASE_URL } from "@/lib/api";

export type MediaAsset = {
  id: string;
  type: "video" | "image" | "thumbnail";
  originalFilename: string;
  r2Key: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
  duration?: number;
  width?: number;
  height?: number;
  status: "uploading" | "ready" | "failed";
  createdAt: string;
  updatedAt: string;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; message: string; code?: string };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json()) as ApiSuccess<T> | ApiError;
  if (!response.ok || !body.success) {
    throw new Error("message" in body ? body.message : "Request failed");
  }
  return body.data;
}

export async function listMedia(): Promise<{
  media: MediaAsset[];
  limits: { maxUploadBytes: number };
}> {
  return apiFetch("/api/media");
}

export async function deleteMedia(id: string): Promise<void> {
  await apiFetch(`/api/media/${id}`, { method: "DELETE" });
}

export async function presignMedia(input: {
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  type?: "video" | "image" | "thumbnail";
}): Promise<{
  uploadUrl: string;
  r2Key: string;
  publicUrl: string;
  headers: { "Content-Type": string };
  expiresIn: number;
}> {
  return apiFetch("/api/media/presign", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type PresignBatchItem = {
  clientIndex: number;
  uploadUrl: string;
  r2Key: string;
  publicUrl: string;
  headers: { "Content-Type": string };
  expiresIn: number;
};

export async function presignMediaBatch(
  files: Array<{
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    type?: "video" | "image" | "thumbnail";
  }>,
): Promise<{ uploads: PresignBatchItem[] }> {
  return apiFetch("/api/media/presign-batch", {
    method: "POST",
    body: JSON.stringify({ files }),
  });
}

export async function bulkDeleteMedia(ids: string[]): Promise<{ deletedCount: number }> {
  return apiFetch("/api/media/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function completeMedia(input: {
  r2Key: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  type?: "video" | "image" | "thumbnail";
}): Promise<{ media: MediaAsset }> {
  return apiFetch("/api/media/complete", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function uploadToR2(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`R2 upload failed (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error("Network error during R2 upload"));
    xhr.send(file);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
