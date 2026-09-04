"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  SquarePen,
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
import { listPosts } from "@/lib/posts-api";
import { accountLabel, listSocialAccounts } from "@/lib/social-api";

function greeting(name: string) {
  const hour = new Date().getHours();
  const first = name.split(" ")[0] || name;
  const part =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${first}`;
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

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const posts = useMemo(() => postsQuery.data?.posts ?? [], [postsQuery.data]);

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
                        className="flex items-center justify-between gap-3 py-3 hover:bg-muted/30 -mx-2 rounded-lg px-2"
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

      {!noAccounts ? (
        <Card className="shadow-none">
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
                      className="flex items-center justify-between gap-3 py-3 hover:bg-muted/30 -mx-2 rounded-lg px-2"
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
