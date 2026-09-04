export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:5001";

export type ServiceStatus = "ok" | "error" | "disconnected";

export interface HealthResponse {
  success: boolean;
  services: {
    api: ServiceStatus;
    mongodb: ServiceStatus;
    redis: ServiceStatus;
  };
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    cache: "no-store",
  });

  if (!response.ok && response.status !== 503) {
    throw new Error(`Health check failed (${response.status})`);
  }

  return (await response.json()) as HealthResponse;
}
