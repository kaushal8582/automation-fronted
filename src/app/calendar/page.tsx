"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SquarePen } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listPosts, type Post, type PostStatus } from "@/lib/posts-api";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthStart(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function addMonths(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function mondayIndex(jsDay: number) {
  return (jsDay + 6) % 7;
}

function buildGrid(year: number, month: number): Date[] {
  const first = monthStart(year, month);
  const startOffset = mondayIndex(first.getDay());
  const start = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function dateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function displayDate(post: Post) {
  return new Date(post.scheduledAt ?? post.createdAt);
}

function statusTone(status: PostStatus) {
  switch (status) {
    case "published":
      return "bg-emerald-50 text-emerald-800";
    case "failed":
      return "bg-red-50 text-red-800";
    case "scheduled":
      return "bg-sky-50 text-sky-800";
    case "partially_published":
      return "bg-amber-50 text-amber-900";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function CalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [today] = useState(() => new Date());
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const year = yearParam != null ? Number(yearParam) : today.getFullYear();
  const month = monthParam != null ? Number(monthParam) : today.getMonth();
  const [selected, setSelected] = useState<Post | null>(null);

  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["posts", "calendar", year, month],
    queryFn: () =>
      listPosts({
        limit: 200,
        from: from.toISOString(),
        to: to.toISOString(),
      }),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of data?.posts ?? []) {
      const key = dateKey(displayDate(post));
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    }
    return map;
  }, [data]);

  const cells = useMemo(() => buildGrid(year, month), [year, month]);
  const title = monthStart(year, month).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  function goTo(next: { year: number; month: number }) {
    router.push(`/calendar?year=${next.year}&month=${next.month}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Calendar"
        description="See scheduled and published posts by date."
        actions={
          <Button onClick={() => router.push("/create-post")}>
            <SquarePen className="size-4" />
            Create Post
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              goTo({ year: today.getFullYear(), month: today.getMonth() })
            }
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(addMonths(year, month, -1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(addMonths(year, month, 1))}
          >
            Next
          </Button>
        </div>
        <h2 className="text-lg font-medium">{title}</h2>
      </div>

      {isLoading ? <Skeleton className="h-96 w-full rounded-xl" /> : null}
      {error ? (
        <p className="text-destructive text-sm">
          {error instanceof Error ? error.message : "Failed to load calendar"}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="text-muted-foreground grid min-w-[720px] grid-cols-7 border-b bg-muted/30 text-xs font-medium">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2 text-center">
              {day}
            </div>
          ))}
        </div>
        <div className="grid min-w-[720px] grid-cols-7">
          {cells.map((day) => {
            const inMonth = day.getMonth() === month;
            const key = dateKey(day);
            const posts = byDay.get(key) ?? [];
            const visible = posts.slice(0, 3);
            const extra = posts.length - visible.length;
            const isToday = key === dateKey(today);

            return (
              <div
                key={key}
                className={cn(
                  "min-h-28 border-t border-r p-1.5 last:border-r-0",
                  inMonth ? "bg-card" : "bg-muted/20",
                )}
              >
                <p
                  className={cn(
                    "mb-1 text-xs",
                    isToday
                      ? "bg-primary text-primary-foreground inline-flex size-5 items-center justify-center rounded-full"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {day.getDate()}
                </p>
                <ul className="space-y-1">
                  {visible.map((post) => (
                    <li key={post.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(post)}
                        className={cn(
                          "block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] leading-4",
                          statusTone(post.status),
                        )}
                        title={post.caption || "(no caption)"}
                      >
                        {displayDate(post).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        {post.caption || "(no caption)"}
                      </button>
                    </li>
                  ))}
                  {extra > 0 ? (
                    <li className="text-muted-foreground px-1 text-[11px]">+{extra} more</li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile agenda */}
      <div className="space-y-2 md:hidden">
        <h3 className="text-sm font-medium">This month</h3>
        {(data?.posts ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">No posts in this month.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {(data?.posts ?? []).map((post) => (
              <li key={post.id}>
                <Link href={`/posts/${post.id}`} className="flex items-center justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {post.caption || "(no caption)"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {displayDate(post).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={post.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setSelected(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <StatusBadge status={selected.status} />
                <h3 className="mt-2 text-base font-semibold">
                  {selected.caption || "(no caption)"}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {displayDate(selected).toLocaleString()} · {selected.totalDestinations}{" "}
                  destinations
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Link href={`/posts/${selected.id}`}>
                <Button>View details</Button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <AppShell title="Calendar">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <CalendarContent />
      </Suspense>
    </AppShell>
  );
}
