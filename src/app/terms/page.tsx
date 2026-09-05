import Link from "next/link";
import { MastPlayerLogo } from "@/components/shared/mastplayer-logo";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/" className="mb-8 inline-block">
        <MastPlayerLogo />
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="text-muted-foreground mt-2 text-sm">Effective date: September 5, 2026</p>
      <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
        By using MastPlayer you agree to these terms. MastPlayer lets you connect Instagram and
        Facebook accounts via Meta OAuth, upload media, and publish or schedule content to accounts
        you control.
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-semibold tracking-tight">1. Your responsibilities</h2>
          <p className="text-muted-foreground mt-2">
            You must have the rights to any content you upload or publish. You are responsible for
            complying with Meta, Instagram, and Facebook policies, as well as applicable laws.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold tracking-tight">2. Account and access</h2>
          <p className="text-muted-foreground mt-2">
            Keep your login credentials secure. You may disconnect social accounts at any time.
            We may suspend access for abuse, security risk, or policy violations.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold tracking-tight">3. Service availability</h2>
          <p className="text-muted-foreground mt-2">
            MastPlayer is provided as-is. Publishing depends on third-party platforms (including
            Meta) and may fail or be delayed for reasons outside our control.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold tracking-tight">4. Contact</h2>
          <p className="text-muted-foreground mt-2">
            Questions about these terms:{" "}
            <a
              href="mailto:support@mastplayer.in"
              className="text-foreground underline underline-offset-2"
            >
              support@mastplayer.in
            </a>
            .
          </p>
        </section>
      </div>

      <p className="text-muted-foreground mt-12 text-sm">
        See also our{" "}
        <Link href="/privacy" className="text-foreground underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
