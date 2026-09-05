import Link from "next/link";
import { MastPlayerLogo } from "@/components/shared/mastplayer-logo";

const sections: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Who we are",
    body: (
      <>
        MastPlayer (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is a social media publishing and
        scheduling service available at{" "}
        <a
          href="https://automation.mastplayer.in"
          className="text-foreground underline underline-offset-2"
        >
          automation.mastplayer.in
        </a>
        . This Privacy Policy explains how we collect, use, store, and share information when you
        use MastPlayer.
      </>
    ),
  },
  {
    title: "2. Information we collect",
    body: (
      <>
        <p className="mb-3">Depending on how you use MastPlayer, we may collect:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground font-medium">Account information:</strong> name,
            email address, password (stored hashed), and timezone.
          </li>
          <li>
            <strong className="text-foreground font-medium">Social account data:</strong> Instagram
            Professional and Facebook Page identifiers, usernames, profile metadata, and OAuth
            access tokens needed to publish on your behalf. Tokens are stored encrypted.
          </li>
          <li>
            <strong className="text-foreground font-medium">Content you create:</strong> captions,
            media files (images/videos), schedules, destination selections, and related post
            metadata.
          </li>
          <li>
            <strong className="text-foreground font-medium">Performance metrics:</strong> engagement
            metrics we sync from connected platforms for posts you publish through MastPlayer.
          </li>
          <li>
            <strong className="text-foreground font-medium">Technical data:</strong> authentication
            cookies, basic request logs, and diagnostic information needed to operate and secure the
            service.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "3. How we use your information",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Create and manage your MastPlayer account</li>
        <li>Connect Instagram and Facebook accounts via Meta OAuth</li>
        <li>Upload, store, schedule, and publish content to your connected accounts</li>
        <li>Sync and display post performance metrics</li>
        <li>Provide support, prevent abuse, and improve reliability and security</li>
        <li>Comply with legal obligations where applicable</li>
      </ul>
    ),
  },
  {
    title: "4. Instagram, Facebook, and Meta platforms",
    body: (
      <>
        <p className="mb-3">
          When you connect Instagram or Facebook, MastPlayer requests only the permissions needed to
          list eligible accounts, publish content, and read related engagement data. We use Meta
          APIs solely to provide these features for you.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>We do not sell your Meta account data</li>
          <li>We do not use your connected social data for advertising to third parties</li>
          <li>OAuth tokens are encrypted at rest and used only for authorized publishing workflows</li>
          <li>You can disconnect social accounts from MastPlayer at any time</li>
        </ul>
        <p className="mt-3">
          Your use of Instagram and Facebook remains subject to Meta&apos;s own terms and privacy
          policies.
        </p>
      </>
    ),
  },
  {
    title: "5. Cookies and authentication",
    body: (
      <>
        MastPlayer uses HTTP-only cookies to keep you signed in (access and refresh tokens). These
        cookies are required for authentication and are not used for third-party advertising.
      </>
    ),
  },
  {
    title: "6. How we share information",
    body: (
      <>
        <p className="mb-3">
          We share information only as needed to operate MastPlayer, including with:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground font-medium">Infrastructure providers:</strong>{" "}
            database, queue/cache, and object storage services that host application data and media
            (including Cloudflare R2 for media files)
          </li>
          <li>
            <strong className="text-foreground font-medium">Meta Platforms:</strong> when you
            authorize publishing or metrics sync to Instagram/Facebook
          </li>
          <li>
            <strong className="text-foreground font-medium">Legal or safety needs:</strong> if
            required by law or to protect users and the service
          </li>
        </ul>
        <p className="mt-3">We do not sell personal information.</p>
      </>
    ),
  },
  {
    title: "7. Data retention and deletion",
    body: (
      <>
        We retain account, social connection, post, media, and metrics data while your account is
        active and as needed to provide the service. You may request deletion of your account and
        associated data by contacting us. Some records may be retained for a limited period where
        required for security, backups, or legal compliance.
      </>
    ),
  },
  {
    title: "8. Security",
    body: (
      <>
        We use industry-standard practices to protect your data, including encrypted transport
        (HTTPS), hashed passwords, and encrypted storage of social OAuth tokens. No method of
        transmission or storage is 100% secure; please use a strong unique password and keep your
        credentials private.
      </>
    ),
  },
  {
    title: "9. Your choices and rights",
    body: (
      <>
        Depending on where you live, you may have rights to access, correct, or delete personal
        information we hold about you. You can also disconnect social accounts from within
        MastPlayer. To make a privacy request, email us at the contact below.
      </>
    ),
  },
  {
    title: "10. Children",
    body: (
      <>
        MastPlayer is not directed to children under 13 (or the minimum age required in your
        jurisdiction). We do not knowingly collect personal information from children.
      </>
    ),
  },
  {
    title: "11. Changes to this policy",
    body: (
      <>
        We may update this Privacy Policy from time to time. The &quot;Effective date&quot; at the
        top will be revised when changes are posted. Continued use of MastPlayer after an update
        means you accept the revised policy.
      </>
    ),
  },
  {
    title: "12. Contact",
    body: (
      <>
        For privacy questions or data requests, contact:{" "}
        <a
          href="mailto:kaushalkumar02918@gmail.com"
          className="text-foreground underline underline-offset-2"
        >
          kaushalkumar02918@gmail.com
        </a>
        .
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/" className="mb-8 inline-block">
        <MastPlayerLogo />
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-muted-foreground mt-2 text-sm">Effective date: September 5, 2026</p>
      <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
        This policy describes how MastPlayer handles personal and account-related information. It is
        provided for transparency and Meta App Review readiness; it is not formal legal advice.
      </p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-base font-semibold tracking-tight">{section.title}</h2>
            <div className="text-muted-foreground mt-2 text-sm leading-relaxed">{section.body}</div>
          </section>
        ))}
      </div>

      <p className="text-muted-foreground mt-12 text-sm">
        See also our{" "}
        <Link href="/terms" className="text-foreground underline underline-offset-2">
          Terms of Service
        </Link>
        .
      </p>
    </div>
  );
}
