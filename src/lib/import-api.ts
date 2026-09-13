import { API_BASE_URL } from "@/lib/api";

export type ImportPlatform = "instagram" | "facebook" | string;

export type ImportSourceAccount = {
  id: string;
  platform: ImportPlatform;
  accountType: string;
  platformAccountId: string;
  username?: string;
  displayName?: string;
  profilePicture?: string;
  status: string;
  permissions?: string[];
};

export type ExternalMediaItem = {
  externalId: string;
  platform: ImportPlatform;
  accountId: string;
  mediaType: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  caption?: string;
  createdAt?: string;
  duration?: number;
  permalink?: string;
  alreadyImported?: boolean;
  existingMediaId?: string;
};

export type ImportJob = {
  id: string;
  sourceType: string;
  sourcePlatform?: string;
  socialAccountId?: string;
  externalId?: string;
  sourceResourceId?: string;
  sourceUrl?: string;
  status:
    | "pending"
    | "fetching_metadata"
    | "resolving"
    | "downloading"
    | "uploading_to_r2"
    | "processing"
    | "completed"
    | "failed"
    | "already_imported"
    | string;
  progress?: number;
  mediaAssetId?: string;
  errorCode?: string;
  errorMessage?: string;
  caption?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; message: string; code?: string };

export class ImportApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ImportApiError";
    this.code = code;
  }
}

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
    throw new ImportApiError(
      "message" in body ? body.message : "Request failed",
      "code" in body ? body.code : undefined,
    );
  }
  return body.data;
}

export async function listImportSources(): Promise<{
  platforms: Array<{ platform: ImportPlatform; supported: boolean }>;
  urlImport: { supported: boolean; adapters: string[]; note: string };
  accounts: ImportSourceAccount[];
}> {
  return apiFetch("/api/import/sources");
}

export async function listAccountMedia(
  socialAccountId: string,
  params?: { limit?: number; cursor?: string },
): Promise<{
  items: ExternalMediaItem[];
  nextCursor?: string;
  account: {
    id: string;
    platform: ImportPlatform;
    username?: string;
    displayName?: string;
  };
  pageSize: number;
}> {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.cursor) search.set("cursor", params.cursor);
  const qs = search.toString();
  return apiFetch(
    `/api/import/accounts/${socialAccountId}/media${qs ? `?${qs}` : ""}`,
  );
}

export async function importAccountMedia(
  socialAccountId: string,
  externalIds: string[],
): Promise<{ jobs: ImportJob[] }> {
  return apiFetch(`/api/import/accounts/${socialAccountId}/import`, {
    method: "POST",
    body: JSON.stringify({ externalIds }),
  });
}

export async function previewImportUrl(
  url: string,
  options?: { socialAccountId?: string },
): Promise<{
  preview: {
    url: string;
    mediaType: string;
    mimeType?: string;
    filename?: string;
    thumbnailUrl?: string;
    caption?: string;
    platform?: string;
    shortcode?: string;
    permalink?: string;
    externalId?: string;
    socialAccountId?: string;
    accountLabel?: string;
    alreadyImported?: boolean;
    existingMediaId?: string;
  };
  adapter: string;
}> {
  return apiFetch("/api/import/url/preview", {
    method: "POST",
    body: JSON.stringify({
      url,
      ...(options?.socialAccountId ? { socialAccountId: options.socialAccountId } : {}),
    }),
  });
}

export async function importFromUrl(
  url: string,
  options?: { socialAccountId?: string },
): Promise<{ jobs: ImportJob[] }> {
  return apiFetch("/api/import/url/import", {
    method: "POST",
    body: JSON.stringify({
      url,
      ...(options?.socialAccountId ? { socialAccountId: options.socialAccountId } : {}),
    }),
  });
}

export type InstagramPublicResource = {
  id: string;
  type: "video" | "image" | "audio" | string;
  format: string;
  quality: string;
  size: number;
  downloadUrl: string;
  selected?: boolean;
  alreadyImported?: boolean;
  existingMediaId?: string;
  importable?: boolean;
};

export type InstagramPublicPreview = {
  sourceUrl: string;
  sourcePlatform: string;
  externalId: string;
  title: string;
  caption: string;
  thumbnail?: string;
  duration?: string;
  durationSeconds?: number;
  resources: InstagramPublicResource[];
};

export const INSTAGRAM_IMPORT_ERROR_MESSAGES: Record<string, string> = {
  INVALID_INSTAGRAM_URL: "Invalid Instagram URL. Use a reel, post, or IGTV link.",
  INSTAGRAM_PARSE_FAILED:
    "Could not parse this Instagram link. It may be private or unavailable.",
  INSTAGRAM_MEDIA_NOT_FOUND: "No downloadable media found for this Instagram URL.",
  INSTAGRAM_PROVIDER_RATE_LIMIT:
    "Instagram download provider rate-limited this request. Try again shortly.",
  INSTAGRAM_PROVIDER_UNAVAILABLE: "Instagram download provider is temporarily unavailable.",
  INSTAGRAM_DOWNLOAD_EXPIRED: "Download links expired. Please preview the Instagram link again.",
  IMPORT_DOWNLOAD_FAILED: "Failed to download media from Instagram.",
  IMPORT_MEDIA_TOO_LARGE: "This media exceeds the maximum allowed file size.",
  IMPORT_R2_UPLOAD_FAILED: "Failed to upload imported media to storage.",
  IMPORT_DUPLICATE: "This media was already imported.",
  IMPORT_RIGHTS_NOT_CONFIRMED:
    "Confirm that you own this content or have permission to reuse and republish it.",
};

export function humanizeImportError(error: unknown): string {
  if (error instanceof ImportApiError && error.code && INSTAGRAM_IMPORT_ERROR_MESSAGES[error.code]) {
    return INSTAGRAM_IMPORT_ERROR_MESSAGES[error.code]!;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export async function previewInstagramPublicLink(
  url: string,
): Promise<InstagramPublicPreview> {
  return apiFetch("/api/import/instagram/preview", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function importInstagramPublicResources(input: {
  sourceUrl: string;
  resourceIds: string[];
  rightsConfirmed: true;
  forceDuplicate?: boolean;
}): Promise<{
  jobs: ImportJob[];
  preview: {
    title: string;
    caption: string;
    thumbnail?: string;
    externalId: string;
    sourceUrl: string;
  };
}> {
  return apiFetch("/api/import/instagram/import", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getImportJobs(ids: string[]): Promise<{ jobs: ImportJob[] }> {
  if (ids.length === 0) return { jobs: [] };
  return apiFetch(`/api/import/jobs?ids=${encodeURIComponent(ids.join(","))}`);
}

export async function retryImportJob(id: string): Promise<{ job: ImportJob }> {
  return apiFetch(`/api/import/jobs/${id}/retry`, { method: "POST" });
}

export function isImportTerminal(status: string): boolean {
  return status === "completed" || status === "failed" || status === "already_imported";
}

export function formatImportJobStatus(status: string): string {
  switch (status) {
    case "pending":
      return "Queued…";
    case "fetching_metadata":
    case "resolving":
      return "Resolving…";
    case "downloading":
      return "Downloading…";
    case "uploading_to_r2":
      return "Uploading to R2…";
    case "processing":
      return "Processing…";
    case "completed":
      return "Completed";
    case "already_imported":
      return "Already imported";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}
