import Link from "next/link";
import { MastPlayerLogo } from "@/components/shared/mastplayer-logo";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/" className="mb-8 inline-block">
        <MastPlayerLogo />
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
        This is a placeholder terms page for MastPlayer. Replace this content with your legal terms
        before production launch. By using MastPlayer you agree to connect social accounts via Meta
        OAuth and to publish only content you have rights to distribute.
      </p>
    </div>
  );
}
