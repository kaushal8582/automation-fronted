import { API_BASE_URL } from "@/lib/api";

export type SocialAccount = {
  id: string;
  platform: "instagram" | "facebook" | string;
  accountType: string;
  platformAccountId: string;
  username?: string;
  displayName?: string;
  profilePicture?: string;
  status: string;
  permissions?: string[];
  tokenExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; message: string; code?: string };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
    throw new Error("message" in body ? body.message : "Request failed");
  }
  return body.data;
}

export async function listSocialAccounts(): Promise<SocialAccount[]> {
  const data = await apiFetch<{ accounts: SocialAccount[] }>("/api/social/accounts");
  return data.accounts ?? [];
}

export async function connectInstagramOAuth(): Promise<{ authorizationUrl: string }> {
  return apiFetch("/api/social/instagram/connect");
}

export async function connectFacebookOAuth(): Promise<{ authorizationUrl: string }> {
  return apiFetch("/api/social/facebook/connect");
}

export async function reconnectSocialAccount(
  id: string,
): Promise<{ authorizationUrl: string }> {
  return apiFetch(`/api/social/accounts/${id}/reconnect`, { method: "POST" });
}

export async function deleteSocialAccount(id: string): Promise<void> {
  await apiFetch(`/api/social/accounts/${id}`, { method: "DELETE" });
}

export function accountLabel(account: SocialAccount): string {
  if (account.platform === "instagram") {
    return account.username ? `@${account.username}` : account.platformAccountId;
  }
  return account.displayName || account.username || account.platformAccountId;
}
