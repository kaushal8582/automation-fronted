import { API_BASE_URL } from "@/lib/api";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  message: string;
  code?: string;
};

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json()) as ApiSuccess<T> | ApiError;

  if (!response.ok || !body.success) {
    const message = "message" in body ? body.message : "Request failed";
    throw new Error(message);
  }

  return body.data;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  timezone?: string;
}): Promise<{ user: PublicUser }> {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ user: PublicUser }> {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logoutUser(): Promise<{ loggedOut: boolean }> {
  return apiFetch("/api/auth/logout", { method: "POST" });
}

export async function refreshSession(): Promise<{ refreshed: boolean }> {
  return apiFetch("/api/auth/refresh", { method: "POST" });
}

export async function fetchMe(): Promise<{ user: PublicUser }> {
  return apiFetch("/api/auth/me", { method: "GET" });
}
