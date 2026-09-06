"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Upload,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildActivityItems, type ActivityKind } from "@/lib/activity";
import { listMedia } from "@/lib/media-api";
import { listPosts } from "@/lib/posts-api";
import { listSocialAccounts } from "@/lib/social-api";

function kindIcon(kind: ActivityKind) {
  switch (kind) {
    case "uploaded":
      return Upload;
    case "connected":
      return Users;
    case "scheduled":
      return CalendarClock;
    case "published":
      return CheckCircle2;
    case "failed":
      return AlertTriangle;
    default:
      return ActivityIcon;
  }
}

function ActivityContent() {
  const accountsQuery = useQuery({
    queryKey: ["social-accounts"],
    queryFn: listSocialAccounts,
  });
  const postsQuery = useQuery({
    queryKey: ["posts", "activity"],
    queryFn: () => listPosts({ limit: 100 }),
  });
  const mediaQuery = useQuery({
    queryKey: ["media"],
    queryFn: listMedia,
  });

  const items = useMemo(
    () =>
      buildActivityItems({
        posts: postsQuery.data?.posts ?? [],
        media: mediaQuery.data?.media ?? [],
        accounts: accountsQuery.data ?? [],
      }),
    [postsQuery.data, mediaQuery.data, accountsQuery.data],
  );

  const loading =
    accountsQuery.isLoading || postsQuery.isLoading || mediaQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description="Uploads, connects, publishes, and failures in one timeline."
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <EmptyState
          icon={<ActivityIcon className="size-5" />}
          title="No activity yet"
          description="Upload media, connect accounts, or publish a post to see activity here."
          action={{ label: "Create post", onClick: () => (window.location.href = "/create-post") }}
        />
      ) : null}

      {!loading && items.length > 0 ? (
        <Card className="shadow-none">
          <CardContent className="pt-1">
            <ul className="divide-y">
              {items.map((item) => {
                const Icon = kindIcon(item.kind);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="hover:bg-muted/40 -mx-2 flex items-start gap-3 rounded-lg px-2 py-3"
                    >
                      <span className="bg-accent text-accent-foreground mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs capitalize">
                          {item.kind.replace("_", " ")} · {item.whenLabel}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function ActivityPage() {
  return (
    <AppShell title="Activity">
      <ActivityContent />
    </AppShell>
  );
}
