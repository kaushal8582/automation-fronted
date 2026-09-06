"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Eye,
  Heart,
  MessageCircle,
  Activity as ActivityIcon,
  Radio,
  SquarePen,
  Upload,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildActivityItems } from "@/lib/activity";
import { listMedia } from "@/lib/media-api";
import { getPostMetrics, listPosts, type Post, type PostMetrics } from "@/lib/posts-api";
import { accountLabel, listSocialAccounts } from "@/lib/social-api";

function greeting(name: string) {
  const hour = new Date().getHours();
  const first = name.split(" ")[0] || name;
  const part =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${first}`;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();

  const accountsQuery = useQuery({
    queryKey: ["social-accounts"],
    queryFn: listSocialAccounts,
  });

  const postsQuery = useQuery({
    queryKey: ["posts", "dashboard"],
    queryFn: () => listPosts({ limit: 50 }),
  });

  const mediaQuery = useQuery({
    queryKey: ["media"],
    queryFn: listMedia,
  });

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const posts = useMemo(() => postsQuery.data?.posts ?? [], [postsQuery.data]);
  const media = useMemo(() => mediaQuery.data?.media ?? [], [mediaQuery.data]);

  const publishedPosts = useMemo(
    () =>
      posts.filter(
        (p) => p.status === "published" || p.status === "partially_published",
      ),
    [posts],
  );

  const publishedIds = publishedPosts.map((p) => p.id).join(",");

  const insightsQuery = useQuery({
    queryKey: ["insights", "dashboard", publishedIds],
    queryFn: async () => {
      const batches = publishedPosts.slice(0, 15);
      const results = await Promise.allSettled(
        batches.map(async (post) => {
          const { metrics } = await getPostMetrics(post.id);
          return { post, metrics };
        }),
      );
      return results
        .filter(
          (
            r,
          ): r is PromiseFulfilledResult<{ post: Post; metrics: PostMetrics[] }> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value);
    },
    enabled: publishedPosts.length > 0,
  });

  const insightTotals = useMemo(() => {
    let views = 0;
    let likes = 0;
    let comments = 0;
    let reach = 0;
    const byPost: Array<{ post: Post; views: number }> = [];

    for (const row of insightsQuery.data ?? []) {
      let postViews = 0;
      for (const m of row.metrics) {
        views += m.views ?? 0;
        likes += m.likes ?? 0;
        comments += m.comments ?? 0;
        reach += m.reach ?? 0;
        postViews += m.views ?? 0;
      }
      byPost.push({ post: row.post, views: postViews });
    }

    byPost.sort((a, b) => b.views - a.views);
    return { views, likes, comments, reach, top: byPost.slice(0, 5) };
  }, [insightsQuery.data]);

  const stats = useMemo(() => {
    const scheduled = posts.filter((p) => p.status === "scheduled").length;
    const published = posts.filter((p) => p.status === "published").length;
    const failed = posts.filter(
      (p) => p.status === "failed" || p.status === "partially_published",
    ).length;
    return {
      connected: accounts.filter((a) => a.status === "active").length,
      scheduled,
      published,
      failed,
    };
  }, [accounts, posts]);

  const upcoming = useMemo(
    () =>
      posts
        .filter((p) => p.status === "scheduled" && p.scheduledAt)
        .sort(
          (a, b) =>
            new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime(),
        )
        .slice(0, 5),
    [posts],
  );

  const recent = useMemo(
    () =>
      [...posts]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [posts],
  );

  const activityPreview = useMemo(
    () => buildActivityItems({ posts, media, accounts }).slice(0, 6),
    [posts, media, accounts],
  );

  const loading = accountsQuery.isLoading || postsQuery.isLoading;
  const noAccounts = !accountsQuery.isLoading && accounts.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={greeting(user?.name ?? "there")}
        description="Here's what's happening with your content."
        actions={
          <Button size="lg" onClick={() => router.push("/create-post")}>
            <SquarePen className="size-4" />
            Create Post
          </Button>
        }
      />

      {noAccounts ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="Welcome to MastPlayer"
          description="Connect an Instagram or Facebook account, upload a video, then publish or schedule your first post."
          action={{ label: "Connect account", onClick: () => router.push("/accounts") }}
        />
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !noAccounts ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Connected accounts",
              value: stats.connected,
              icon: Users,
              hint: "Active destinations",
            },
            {
              label: "Scheduled",
              value: stats.scheduled,
              icon: CalendarClock,
              hint: "Waiting to publish",
            },
            {
              label: "Published",
              value: stats.published,
              icon: CheckCircle2,
              hint: "Successfully delivered",
            },
            {
              label: "Needs attention",
              value: stats.failed,
              icon: AlertTriangle,
              hint: "Failed or partial",
            },
          ].map((stat) => (
            <Card key={stat.label} className="shadow-none">
              <CardContent className="flex items-start justify-between pt-1">
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{stat.value}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{stat.hint}</p>
                </div>
                <span className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-lg">
                  <stat.icon className="size-4" />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!noAccounts ? (
        <Card className="shadow-none">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Insights</CardTitle>
            <Link href="/activity" className="text-muted-foreground text-xs hover:text-foreground">
              Activity
            </Link>
          </CardHeader>
          <CardContent className="space-y-5">
            {insightsQuery.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : publishedPosts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Publish a post to see engagement insights here.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Views", value: insightTotals.views, icon: Eye },
                    { label: "Likes", value: insightTotals.likes, icon: Heart },
                    { label: "Comments", value: insightTotals.comments, icon: MessageCircle },
                    { label: "Reach", value: insightTotals.reach, icon: Radio },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border px-3 py-3">
                      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <item.icon className="size-3.5" />
                        {item.label}
                      </div>
                      <p className="mt-1 text-2xl font-semibold tracking-tight">
                        {formatCount(item.value)}
                      </p>
                    </div>
                  ))}
                </div>
                {insightTotals.top.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">Top posts by views</p>
                    <ul className="divide-y rounded-xl border">
                      {insightTotals.top.map(({ post, views }) => (
                        <li key={post.id}>
                          <Link
                            href={`/posts/${post.id}`}
                            className="hover:bg-muted/30 flex items-center justify-between gap-3 px-3 py-2.5"
                          >
                            <span className="truncate text-sm">
                              {post.caption || "(no caption)"}
                            </span>
                            <span className="text-muted-foreground shrink-0 text-xs">
                              {formatCount(views)} views
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {!noAccounts ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="shadow-none lg:col-span-3">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Upcoming posts</CardTitle>
              <Link href="/calendar" className="text-muted-foreground text-xs hover:text-foreground">
                Open calendar
              </Link>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground text-sm">No scheduled posts yet.</p>
              ) : (
                <ul className="divide-y">
                  {upcoming.map((post) => (
                    <li key={post.id}>
                      <Link
                        href={`/posts/${post.id}`}
                        className="hover:bg-muted/30 -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {post.caption || "(no caption)"}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {post.scheduledAt
                              ? new Date(post.scheduledAt).toLocaleString()
                              : "—"}{" "}
                            · {post.totalDestinations} destination
                            {post.totalDestinations === 1 ? "" : "s"}
                          </p>
                        </div>
                        <StatusBadge status={post.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent activity</CardTitle>
              <Link href="/activity" className="text-muted-foreground text-xs hover:text-foreground">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {activityPreview.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activityPreview.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="hover:bg-muted/40 -mx-1 flex gap-2.5 rounded-lg px-1 py-1"
                      >
                        <span className="bg-accent text-accent-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
                          {item.kind === "uploaded" ? (
                            <Upload className="size-3.5" />
                          ) : item.kind === "failed" ? (
                            <AlertTriangle className="size-3.5" />
                          ) : item.kind === "connected" ? (
                            <Users className="size-3.5" />
                          ) : (
                            <ActivityIcon className="size-3.5" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="text-muted-foreground text-xs">{item.whenLabel}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!noAccounts ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="shadow-none lg:col-span-3">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent posts</CardTitle>
              <Link href="/posts" className="text-muted-foreground text-xs hover:text-foreground">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-muted-foreground text-sm">No posts yet.</p>
              ) : (
                <ul className="divide-y">
                  {recent.map((post) => (
                    <li key={post.id}>
                      <Link
                        href={`/posts/${post.id}`}
                        className="hover:bg-muted/30 -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {post.caption || "(no caption)"}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {new Date(post.createdAt).toLocaleString()} · {post.totalDestinations}{" "}
                            destinations
                          </p>
                        </div>
                        <StatusBadge status={post.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Connected accounts</CardTitle>
              <Link href="/accounts" className="text-muted-foreground text-xs hover:text-foreground">
                Manage
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {accounts.slice(0, 5).map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-2 rounded-lg border px-2.5 py-2"
                >
                  <PlatformIcon platform={account.platform} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{accountLabel(account)}</p>
                    <p className="text-muted-foreground text-xs capitalize">{account.platform}</p>
                  </div>
                  <StatusBadge status={account.status === "active" ? "active" : account.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell title="Overview">
      <DashboardContent />
    </AppShell>
  );
}
