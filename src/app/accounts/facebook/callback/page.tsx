"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

/**
 * Facebook OAuth callback.
 * Meta redirects the browser here with ?code=…&state=… (or ?error=…).
 * We simply forward the params to the backend GET /api/social/facebook/callback
 * which handles the token exchange server-side and redirects to /accounts.
 */
function FacebookCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      router.replace(
        `/accounts?error=${encodeURIComponent(errorDescription ?? error)}`,
      );
      return;
    }

    if (!code || !state) {
      router.replace(`/accounts?error=${encodeURIComponent("Missing OAuth code or state")}`);
      return;
    }

    // Forward to backend callback — it does the exchange and redirects to /accounts
    const params = new URLSearchParams({ code, state });
    // Use an absolute external URL so Next.js doesn't intercept it
    const backendUrl = `${API_BASE_URL}/api/social/facebook/callback?${params.toString()}`;
    window.location.assign(backendUrl);
  }, [searchParams, router]);

  return (
    <div className="flex flex-1 items-center justify-center p-10 text-sm text-muted-foreground">
      Exchanging token with Facebook…
    </div>
  );
}

export default function FacebookCallbackPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-muted-foreground">Loading…</div>}>
      <FacebookCallbackInner />
    </Suspense>
  );
}
