"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHealth, type ServiceStatus } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function statusVariant(status: ServiceStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ok") return "default";
  if (status === "disconnected") return "secondary";
  return "destructive";
}

export function HealthStatus() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 15_000,
  });

  return (
    <Card className="w-full max-w-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>System health</CardTitle>
          <CardDescription>
            Live status from <code className="text-xs">GET /api/health</code>
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : null}

        {isError ? (
          <p className="text-sm text-destructive">
            Unable to reach API: {error instanceof Error ? error.message : "Unknown error"}
          </p>
        ) : null}

        {data ? (
          <>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm font-medium">Overall</span>
              <Badge variant={data.success ? "default" : "destructive"}>
                {data.success ? "healthy" : "degraded"}
              </Badge>
            </div>
            {(
              [
                ["api", data.services.api],
                ["mongodb", data.services.mongodb],
                ["redis", data.services.redis],
              ] as const
            ).map(([name, status]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="text-sm font-medium capitalize">{name}</span>
                <Badge variant={statusVariant(status)}>{status}</Badge>
              </div>
            ))}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
