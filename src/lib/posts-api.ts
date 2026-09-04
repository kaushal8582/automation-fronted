import { API_BASE_URL } from "@/lib/api";

export type PostStatus =
  | "draft"
  | "queued"
  | "scheduled"
  | "processing"
  | "partially_published"
  | "published"
  | "failed"
  | "cancelled";

export type DestinationStatus =
  | "pending"
  | "queued"
  | "processing"
  | "uploading"
  | "processing_media"
  | "ready_to_publish"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type Post = {
  id: string;
  mediaId: string;
  caption: string;
  instagramCaption?: string;
  publishMode: "now" | "scheduled";
  scheduledAt?: string;
  timezone: string;
  status: PostStatus;
  totalDestinations: number;
  successfulDestinations: number;
  failedDestinations: number;
  createdAt: string;
  updatedAt: string;
};

export type PostDestination = {
  id: string;
  postId: string;
  socialAccountId: string;
  platform: "instagram" | "facebook";
  status: DestinationStatus;
  platformContainerId?: string;
  platformPostId?: string;
  platformPostUrl?: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  lastErrorCode?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export class PostsApiError extends Error {
  code?: string;
  postId?: string;

  constructor(message: string, opts?: { code?: string; postId?: string }) {
    super(message);
    this.name = "PostsApiError";
    this.code = opts?.code;
    this.postId = opts?.postId;
  }
}

type ApiSuccess<T> = { success: true; data: T };
type ApiError = {
  success: false;
  message: string;
  code?: string;
  details?: { postId?: string };
};

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
    const err = body as ApiError;
    throw new PostsApiError(err.message || "Request failed", {
      code: err.code,
      postId: err.details?.postId,
    });
  }
  return body.data;
}

export async function createPost(input: {
  mediaId: string;
  socialAccountIds: string[];
  caption?: string;
  instagramCaption?: string;
  scheduledAt?: string;
  timezone?: string;
}): Promise<{
  post: Post;
  destinations: PostDestination[];
  usedTemporaryUrl: boolean;
}> {
  return apiFetch("/api/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listPosts(params?: {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
  status?: PostStatus;
}): Promise<{ posts: Post[]; total: number; limit: number; offset: number }> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.status) search.set("status", params.status);
  const qs = search.toString();
  return apiFetch(`/api/posts${qs ? `?${qs}` : ""}`);
}

export async function getPost(
  id: string,
): Promise<{ post: Post; destinations: PostDestination[] }> {
  return apiFetch(`/api/posts/${id}`);
}

export async function cancelPost(
  id: string,
): Promise<{ post: Post; destinations: PostDestination[] }> {
  return apiFetch(`/api/posts/${id}/cancel`, { method: "POST" });
}

export type PostMetrics = {
  id: string;
  destinationId: string;
  platform: string;
  platformPostId?: string;
  views?: number;
  likes?: number;
  comments?: number;
  reach?: number;
  shares?: number;
  fetchedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export async function getPostMetrics(id: string): Promise<{ metrics: PostMetrics[] }> {
  return apiFetch(`/api/posts/${id}/metrics`);
}

export async function refreshPostMetrics(id: string): Promise<{ metrics: PostMetrics[] }> {
  return apiFetch(`/api/posts/${id}/metrics/refresh`, { method: "POST" });
}

export async function retryPost(
  id: string,
  destinationIds?: string[],
): Promise<{
  post: Post;
  destinations: PostDestination[];
  retriedCount: number;
}> {
  return apiFetch(`/api/posts/${id}/retry`, {
    method: "POST",
    body: JSON.stringify(destinationIds ? { destinationIds } : {}),
  });
}
