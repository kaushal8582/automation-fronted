import Link from "next/link";
import { MastPlayerLogo } from "@/components/shared/mastplayer-logo";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/" className="mb-8 inline-block">
        <MastPlayerLogo />
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
        This is a placeholder privacy page for MastPlayer. Replace this content with your legal
        privacy policy before production launch. MastPlayer stores account credentials encrypted,
        uses OAuth for Instagram and Facebook connections, and processes media uploads through your
        configured Cloudflare R2 storage.
      </p>
    </div>
  );
}
