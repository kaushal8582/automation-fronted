"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, SquarePen } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listPosts, type PostStatus } from "@/lib/posts-api";
import { cn } from "@/lib/utils";

const TABS: Array<{ id: "all" | PostStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "scheduled", label: "Scheduled" },
  { id: "processing", label: "Processing" },
  { id: "queued", label: "Queued" },
  { id: "published", label: "Published" },
  { id: "failed", label: "Failed" },
];

function PostsContent() {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | PostStatus>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["posts", "list"],
    queryFn: () => listPosts({ limit: 100 }),
  });

  const posts = useMemo(() => {
    let list = data?.posts ?? [];
    if (tab === "failed") {
      list = list.filter(
        (p) => p.status === "failed" || p.status === "partially_published",
      );
    } else if (tab !== "all") {
      list = list.filter((p) => p.status === tab);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => (p.caption || "").toLowerCase().includes(q));
    }
    return list;
  }, [data, tab, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Posts"
        description="Track everything you've published or scheduled."
        actions={
          <>
            <Link href="/calendar">
              <Button variant="outline">Calendar</Button>
            </Link>
            <Button onClick={() => router.push("/create-post")}>
              <SquarePen className="size-4" />
              Create Post
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="h-9 pl-9"
            placeholder="Search captions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="text-destructive text-sm">
          {error instanceof Error ? error.message : "Failed to load posts"}
        </p>
      ) : null}

      {!isLoading && posts.length === 0 ? (
        <EmptyState
          title={search || tab !== "all" ? "No matching posts" : "No posts yet"}
          description={
            search || tab !== "all"
              ? "Try another filter or search."
              : "Create your first post to publish across connected accounts."
          }
          action={
            !search && tab === "all"
              ? { label: "Create Post", onClick: () => router.push("/create-post") }
              : undefined
          }
        />
      ) : null}

      {posts.length > 0 ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="text-muted-foreground hidden grid-cols-[1fr_120px_160px_140px] gap-3 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase md:grid">
            <span>Content</span>
            <span>Destinations</span>
            <span>Schedule</span>
            <span>Status</span>
          </div>
          <ul className="divide-y">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/posts/${post.id}`}
                  className="hover:bg-muted/30 grid gap-2 px-4 py-3 transition-colors md:grid-cols-[1fr_120px_160px_140px] md:items-center md:gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {post.caption || "(no caption)"}
                    </p>
                    <p className="text-muted-foreground text-xs capitalize">
                      {post.publishMode}
                    </p>
                  </div>
                  <p className="text-sm">
                    {post.successfulDestinations}/{post.totalDestinations}
                    {post.failedDestinations > 0
                      ? ` · ${post.failedDestinations} failed`
                      : ""}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {post.scheduledAt
                      ? new Date(post.scheduledAt).toLocaleString()
                      : new Date(post.createdAt).toLocaleString()}
                  </p>
                  <div>
                    <StatusBadge status={post.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function PostsPage() {
  return (
    <AppShell title="Posts">
      <PostsContent />
    </AppShell>
  );
}
