import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { accountLabel, type SocialAccount } from "@/lib/social-api";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { StatusBadge } from "@/components/shared/status-badge";

export function AccountAvatar({
  account,
  className,
}: {
  account: Pick<SocialAccount, "profilePicture" | "username" | "displayName" | "platform">;
  className?: string;
}) {
  const label = account.username || account.displayName || "?";
  const initial = label.replace("@", "").charAt(0).toUpperCase();

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {account.profilePicture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={account.profilePicture}
          alt=""
          className="size-10 rounded-full object-cover ring-1 ring-border"
        />
      ) : (
        <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full text-sm font-medium ring-1 ring-border">
          {initial}
        </span>
      )}
      <span className="absolute -bottom-0.5 -right-0.5">
        <PlatformIcon platform={account.platform} className="size-4 text-[8px]" />
      </span>
    </span>
  );
}

export function SocialAccountCard({
  account,
  selected,
  onSelect,
  actions,
}: {
  account: SocialAccount;
  selected?: boolean;
  onSelect?: () => void;
  actions?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors",
        selected && "border-primary/40 bg-accent/40",
        onSelect && "cursor-pointer hover:bg-muted/40",
      )}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <AccountAvatar account={account} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{accountLabel(account)}</p>
        <p className="text-muted-foreground truncate text-xs capitalize">
          {account.platform} · {account.accountType.replaceAll("_", " ")}
        </p>
      </div>
      <StatusBadge status={account.status === "active" ? "active" : account.status} />
      {actions}
    </div>
  );
}
