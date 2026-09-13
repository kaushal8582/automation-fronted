"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Activity,
  CalendarDays,
  Download,
  FileVideo,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Settings,
  SquarePen,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { RequireAuth } from "@/components/auth/require-auth";
import { MastPlayerLogo } from "@/components/shared/mastplayer-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/create-post", label: "Create Post", icon: SquarePen },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/posts", label: "Posts", icon: FileVideo },
  { href: "/media", label: "Media Library", icon: Library },
  { href: "/media/import", label: "Import Content", icon: Download },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/accounts", label: "Accounts", icon: Users },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map((item) => {
        const moreSpecificMatch = NAV.some(
          (other) =>
            other.href !== item.href &&
            other.href.startsWith(`${item.href}/`) &&
            (pathname === other.href || pathname.startsWith(`${other.href}/`)),
        );
        const active =
          !moreSpecificMatch &&
          (pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            {active ? (
              <span className="bg-primary absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full" />
            ) : null}
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Link href="/dashboard" onClick={onNavigate}>
          <MastPlayerLogo />
        </Link>
      </div>

      <div className="px-3 pb-3">
        <Link href="/create-post" onClick={onNavigate}>
          <Button className="w-full justify-start gap-2" size="lg">
            <SquarePen className="size-4" />
            Create Post
          </Button>
        </Link>
      </div>

      <NavLinks onNavigate={onNavigate} />

      <div className="mt-auto border-t p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="text-muted-foreground hover:bg-muted/70 hover:text-foreground mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium"
        >
          <Settings className="size-4" />
          Settings
        </Link>
        <div className="rounded-xl border bg-card p-3">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start"
            onClick={() => {
              void (async () => {
                await logout();
                toast.success("Logged out");
                router.push("/login");
              })();
            }}
          >
            <LogOut className="size-3.5" />
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RequireAuth>
      <div className="bg-background flex min-h-svh">
        <aside className="border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-30 hidden w-60 border-r lg:flex lg:flex-col">
          <SidebarBody />
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="bg-sidebar absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col border-r shadow-xl">
              <div className="absolute top-3 right-3">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <SidebarBody onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          <header className="bg-background/80 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-md sm:px-6">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-4" />
            </Button>
            {title ? (
              <p className="text-sm font-medium text-foreground">{title}</p>
            ) : (
              <span className="lg:hidden">
                <MastPlayerLogo variant="icon" />
              </span>
            )}
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}
