import type { MediaAsset } from "@/lib/media-api";
import type { Post } from "@/lib/posts-api";
import type { SocialAccount } from "@/lib/social-api";
import { accountLabel } from "@/lib/social-api";

export type ActivityKind =
  | "uploaded"
  | "scheduled"
  | "published"
  | "failed"
  | "processing"
  | "connected";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  href: string;
  at: string;
  whenLabel: string;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function buildActivityItems(input: {
  posts: Post[];
  media: MediaAsset[];
  accounts: SocialAccount[];
}): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const m of input.media) {
    items.push({
      id: `media-${m.id}`,
      kind: "uploaded",
      title: `Uploaded ${m.originalFilename}`,
      href: "/media",
      at: m.createdAt,
      whenLabel: relativeTime(m.createdAt),
    });
  }

  for (const a of input.accounts) {
    const at = a.createdAt ?? a.updatedAt;
    if (!at) continue;
    items.push({
      id: `account-${a.id}`,
      kind: "connected",
      title: `Connected ${a.platform}: ${accountLabel(a)}`,
      href: "/accounts",
      at,
      whenLabel: relativeTime(at),
    });
  }

  for (const p of input.posts) {
    const caption = p.caption?.trim() || "(no caption)";
    const short = caption.length > 60 ? `${caption.slice(0, 57)}…` : caption;
    let kind: ActivityKind = "processing";
    let title = `Post update: ${short}`;

    if (p.status === "scheduled") {
      kind = "scheduled";
      title = `Scheduled: ${short}`;
    } else if (p.status === "published") {
      kind = "published";
      title = `Published: ${short}`;
    } else if (p.status === "failed" || p.status === "partially_published") {
      kind = "failed";
      title =
        p.status === "partially_published"
          ? `Partially published: ${short}`
          : `Failed: ${short}`;
    } else if (p.status === "processing" || p.status === "queued") {
      kind = "processing";
      title = `Publishing: ${short}`;
    }

    items.push({
      id: `post-${p.id}`,
      kind,
      title,
      href: `/posts/${p.id}`,
      at: p.updatedAt || p.createdAt,
      whenLabel: relativeTime(p.updatedAt || p.createdAt),
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
