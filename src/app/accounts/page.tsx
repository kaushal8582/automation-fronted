"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { AccountAvatar } from "@/components/shared/account-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  accountLabel,
  connectFacebookOAuth,
  connectInstagramOAuth,
  deleteSocialAccount,
  listSocialAccounts,
  reconnectSocialAccount,
  type SocialAccount,
} from "@/lib/social-api";
import { cn } from "@/lib/utils";

function AccountsContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<"all" | "instagram" | "facebook">("all");
  const [query, setQuery] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const username = searchParams.get("username");
    const pages = searchParams.get("pages");
    if (connected === "instagram") {
      toast.success(username ? `Instagram connected: @${username}` : "Instagram connected");
      void queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
    }
    if (connected === "facebook") {
      toast.success(pages ? `Facebook Pages connected: ${pages}` : "Facebook Pages connected");
      void queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
    }
    if (error) toast.error(decodeURIComponent(error));
  }, [searchParams, queryClient]);

  const accountsQuery = useQuery({
    queryKey: ["social-accounts"],
    queryFn: listSocialAccounts,
  });

  const igConnect = useMutation({
    mutationFn: connectInstagramOAuth,
    onSuccess: (data) => {
      window.location.href = data.authorizationUrl;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fbConnect = useMutation({
    mutationFn: connectFacebookOAuth,
    onSuccess: (data) => {
      window.location.href = data.authorizationUrl;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reconnect = useMutation({
    mutationFn: reconnectSocialAccount,
    onSuccess: (data) => {
      window.location.href = data.authorizationUrl;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteSocialAccount,
    onSuccess: async () => {
      toast.success("Account removed");
      await queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      if (filter !== "all" && a.platform !== filter) return false;
      if (!query.trim()) return true;
      const hay = `${accountLabel(a)} ${a.platform} ${a.accountType}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });
  }, [accounts, filter, query]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Accounts"
        description="Connect and manage the accounts you publish to."
        actions={
          <Button size="lg" onClick={() => setConnectOpen(true)}>
            <Plus className="size-4" />
            Connect Account
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {(["all", "instagram", "facebook"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="h-9 pl-9"
            placeholder="Search accounts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {accountsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : null}

      {!accountsQuery.isLoading && accounts.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title="No accounts connected"
          description="Connect Instagram Professional accounts or Facebook Pages to start publishing."
          action={{ label: "Connect Account", onClick: () => setConnectOpen(true) }}
        />
      ) : null}

      {!accountsQuery.isLoading && accounts.length > 0 && filtered.length === 0 ? (
        <EmptyState title="No matching accounts" description="Try a different search or filter." />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((account: SocialAccount) => (
          <div key={account.id} className="rounded-xl border bg-card p-4 shadow-none">
            <div className="flex items-start gap-3">
              <AccountAvatar account={account} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{accountLabel(account)}</p>
                  <StatusBadge status={account.status === "active" ? "active" : account.status} />
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs capitalize">
                  {account.platform} · {account.accountType.replaceAll("_", " ")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {account.platform === "instagram" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reconnect.isPending}
                  onClick={() => reconnect.mutate(account.id)}
                >
                  Reconnect
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Remove ${accountLabel(account)}?`)) remove.mutate(account.id);
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      {connectOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            onClick={() => setConnectOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold tracking-tight">Connect a social account</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              You&apos;ll be redirected to Meta to authorize securely. MastPlayer never asks for your
              social password.
            </p>
            <div className="mt-5 grid gap-3">
              <button
                type="button"
                disabled={igConnect.isPending}
                onClick={() => igConnect.mutate()}
                className="hover:bg-muted/50 flex items-start gap-3 rounded-xl border p-4 text-left transition-colors"
              >
                <span className="flex size-10 items-center justify-center">
                  <PlatformIcon platform="instagram" className="size-10 text-sm" />
                </span>
                <span>
                  <span className="block text-sm font-medium">Instagram</span>
                  <span className="text-muted-foreground text-xs">
                    Connect a professional Instagram account
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={fbConnect.isPending}
                onClick={() => fbConnect.mutate()}
                className="hover:bg-muted/50 flex items-start gap-3 rounded-xl border p-4 text-left transition-colors"
              >
                <span className="flex size-10 items-center justify-center">
                  <PlatformIcon platform="facebook" className="size-10 text-sm" />
                </span>
                <span>
                  <span className="block text-sm font-medium">Facebook</span>
                  <span className="text-muted-foreground text-xs">
                    Connect Facebook Pages you manage
                  </span>
                </span>
              </button>
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="outline" onClick={() => setConnectOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function AccountsPage() {
  return (
    <AppShell title="Accounts">
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <AccountsContent />
      </Suspense>
    </AppShell>
  );
}
