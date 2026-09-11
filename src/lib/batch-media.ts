export const BATCH_MEDIA_STORAGE_KEY = "mastplayer.batchMediaIds";

export function saveBatchMediaIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BATCH_MEDIA_STORAGE_KEY, JSON.stringify(ids));
}

export function readBatchMediaIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(BATCH_MEDIA_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function clearBatchMediaIds(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(BATCH_MEDIA_STORAGE_KEY);
}
