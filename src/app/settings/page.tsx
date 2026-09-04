"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function SettingsContent() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Account preferences available from your profile."
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            These details come from your MastPlayer account. Profile editing is not available via
            API yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Name</p>
            <p className="mt-1 font-medium">{user?.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Email</p>
            <p className="mt-1 font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Timezone</p>
            <p className="mt-1 font-medium">{user?.timezone}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">User ID</p>
            <p className="mt-1 font-mono text-xs">{user?.id}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Publishing defaults</CardTitle>
          <CardDescription>
            Scheduled posts use the timezone stored on your user profile and the timezone chosen
            when creating a post.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Default timezone: <span className="text-foreground font-medium">{user?.timezone}</span>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <SettingsContent />
    </AppShell>
  );
}
