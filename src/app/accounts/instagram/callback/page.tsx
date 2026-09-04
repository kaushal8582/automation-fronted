"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

function InstagramCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("Finishing Instagram connection…");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      router.replace(
        `/accounts?error=${encodeURIComponent(errorDescription || error)}`,
      );
      return;
    }

    if (!code || !state) {
      router.replace(`/accounts?error=${encodeURIComponent("Missing OAuth code or state")}`);
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/social/instagram/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state }),
        });
        const body = await response.json();
        if (!response.ok || !body.success) {
          throw new Error(body.message ?? "OAuth exchange failed");
        }
        const redirectUrl = body.data?.redirectUrl as string | undefined;
        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }
        router.replace("/accounts?connected=instagram");
      } catch (err) {
        const message = err instanceof Error ? err.message : "OAuth exchange failed";
        setMessage(message);
        router.replace(`/accounts?error=${encodeURIComponent(message)}`);
      }
    })();
  }, [searchParams, router]);

  return (
    <div className="flex flex-1 items-center justify-center p-10 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default function InstagramCallbackPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-muted-foreground">Loading…</div>}>
      <InstagramCallbackInner />
    </Suspense>
  );
}
