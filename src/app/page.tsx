"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Layers3,
  RefreshCcw,
  Share2,
  Upload,
  Users,
} from "lucide-react";
import { MastPlayerLogo } from "@/components/shared/mastplayer-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Users,
    title: "Multi-account publishing",
    body: "Connect multiple Instagram accounts and Facebook Pages in one workspace.",
  },
  {
    icon: Upload,
    title: "Upload once",
    body: "Store a video once in your media library and reuse it across destinations.",
  },
  {
    icon: CalendarClock,
    title: "Smart scheduling",
    body: "Choose the exact date, time, and timezone for each scheduled publish.",
  },
  {
    icon: Layers3,
    title: "Bulk publishing",
    body: "Select many destinations and publish without repeating the same workflow.",
  },
  {
    icon: Share2,
    title: "Publishing status",
    body: "See what is scheduled, processing, published, partially published, or failed.",
  },
  {
    icon: RefreshCcw,
    title: "Safe retries",
    body: "Retry failed destinations without republishing accounts that already succeeded.",
  },
];

const FAQS = [
  {
    q: "What social platforms are supported?",
    a: "MastPlayer currently supports Instagram Professional accounts and Facebook Pages.",
  },
  {
    q: "Can I connect multiple Instagram accounts?",
    a: "Yes. You can connect multiple Instagram accounts and publish to them individually or together.",
  },
  {
    q: "Can I publish to multiple accounts at once?",
    a: "Yes. When creating a post, select any combination of connected Instagram accounts and Facebook Pages.",
  },
  {
    q: "Can I schedule posts?",
    a: "Yes. Choose Schedule, pick a date and time at least five minutes ahead, and MastPlayer queues delayed jobs for delivery.",
  },
  {
    q: "What happens if one account fails to publish?",
    a: "Other destinations continue independently. Failed destinations can be retried from the post detail page without affecting successful ones.",
  },
  {
    q: "Do I need to keep my browser open for scheduled posts?",
    a: "No. Scheduled publishing runs through background workers connected to Redis/BullMQ on the server.",
  },
];

function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/">
          <MastPlayerLogo />
        </Link>
        <nav className="text-muted-foreground hidden items-center gap-6 text-sm md:flex">
          <a href="#product" className="hover:text-foreground">
            Product
          </a>
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-foreground">
            How it works
          </a>
          <a href="#faq" className="hover:text-foreground">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link href="/register">
            <Button>Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xl shadow-black/5">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
        <span className="size-2.5 rounded-full bg-red-300" />
        <span className="size-2.5 rounded-full bg-amber-300" />
        <span className="size-2.5 rounded-full bg-emerald-300" />
        <span className="text-muted-foreground ml-2 text-xs">mastplayer.app / create-post</span>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <div className="rounded-xl border p-3">
            <p className="text-xs font-medium text-muted-foreground">Create Post</p>
            <div className="mt-3 aspect-video rounded-lg bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900" />
            <p className="mt-2 text-sm font-medium">launch-reel.mp4</p>
          </div>
          <div className="rounded-xl border p-3 text-sm">
            <p className="text-muted-foreground text-xs">Connected accounts</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-center justify-between">
                <span>@creator_one</span>
                <span className="text-[10px] font-medium text-[#dd2a7b]">Instagram</span>
              </li>
              <li className="flex items-center justify-between">
                <span>@brand_account</span>
                <span className="text-[10px] font-medium text-[#dd2a7b]">Instagram</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Brand Page</span>
                <span className="text-[10px] font-medium text-[#1877F2]">Facebook</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border p-3 text-sm">
            <p className="text-muted-foreground text-xs">Publishing</p>
            <div className="mt-2 flex gap-2">
              <span className="rounded-md bg-muted px-2 py-1 text-xs">Publish now</span>
              <span className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">
                Schedule
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Sep 8, 2026 · 10:00 AM IST</p>
          </div>
          <div className="rounded-xl border bg-primary p-4 text-primary-foreground">
            <p className="text-xs opacity-80">Post summary</p>
            <p className="mt-2 text-sm font-medium">Schedule to 6 accounts</p>
            <p className="mt-1 text-xs opacity-80">1 video · 6 destinations</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b py-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-medium">{q}</span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{a}</p> : null}
    </div>
  );
}

function Showcase({
  title,
  body,
  reverse,
  children,
}: {
  title: string;
  body: string;
  reverse?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-8 lg:grid-cols-2",
        reverse && "lg:[&>*:first-child]:order-2",
      )}
    >
      <div>
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{body}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-background min-h-svh">
      <MarketingHeader />

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <span className="bg-accent text-accent-foreground inline-flex rounded-full px-3 py-1 text-xs font-medium">
              Social publishing, simplified
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Publish once.
              <br />
              Reach everywhere.
            </h1>
            <p className="text-muted-foreground mt-4 max-w-xl text-base leading-relaxed">
              Connect your Instagram accounts and Facebook Pages, upload your content once, and
              publish instantly or schedule it for the perfect time.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg">Start publishing</Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline">
                  See how it works
                </Button>
              </a>
            </div>
            <p className="text-muted-foreground mt-4 text-xs">
              Built for creators and teams who manage multiple social destinations.
            </p>
          </div>
          <HeroPreview />
        </section>

        <section className="border-y bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {[
              "One upload",
              "Multiple accounts",
              "Scheduled publishing",
              "Reliable delivery",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="text-primary size-4" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">
              Everything you need to publish at scale
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              MastPlayer focuses on the publishing workflow: connect accounts, upload media, choose
              destinations, and ship with confidence.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className={cn(
                  "rounded-2xl border bg-card p-5 shadow-none",
                  index === 0 && "md:col-span-2 lg:col-span-1 lg:row-span-1",
                  index === 3 && "bg-accent/40",
                )}
              >
                <feature.icon className="text-primary size-5" />
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-y bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  n: "01",
                  t: "Connect accounts",
                  d: "Connect Instagram and Facebook securely with Meta OAuth.",
                },
                {
                  n: "02",
                  t: "Create content",
                  d: "Upload videos, add captions, and select destinations.",
                },
                {
                  n: "03",
                  t: "Publish or schedule",
                  d: "Publish immediately or choose a future date and time.",
                },
              ].map((step) => (
                <div key={step.n} className="rounded-2xl border bg-card p-6">
                  <p className="text-primary text-sm font-semibold">{step.n}</p>
                  <h3 className="mt-3 text-lg font-semibold">{step.t}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{step.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="product" className="mx-auto max-w-6xl space-y-20 px-4 py-20 sm:px-6">
          <Showcase
            title="Account management"
            body="See every connected Instagram account and Facebook Page, reconnect when tokens expire, and remove accounts you no longer need."
          >
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="space-y-2">
                {["@creator_one", "@brand_account", "Brand Page"].map((name, i) => (
                  <div key={name} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                    <span>{name}</span>
                    <span className="text-xs text-emerald-700">Connected</span>
                    <span className="text-muted-foreground text-[10px]">
                      {i < 2 ? "Instagram" : "Facebook"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Showcase>
          <Showcase
            reverse
            title="Create Post"
            body="Pick a ready video, write one caption, select destinations, and choose publish now or schedule — with a clear summary before you submit."
          >
            <div className="rounded-2xl border bg-card p-4 text-sm shadow-sm">
              <p className="font-medium">Post summary</p>
              <ul className="text-muted-foreground mt-3 space-y-1 text-xs">
                <li>Media: launch-reel.mp4</li>
                <li>Destinations: 6 accounts</li>
                <li>Publishing: Scheduled</li>
              </ul>
              <div className="bg-primary text-primary-foreground mt-4 rounded-lg px-3 py-2 text-center text-xs font-medium">
                Schedule to 6 accounts
              </div>
            </div>
          </Showcase>
          <Showcase
            title="Scheduling calendar"
            body="Browse the month view to see what’s coming up, jump into post details, and keep your publishing calendar organized."
          >
            <div className="grid grid-cols-7 gap-1 rounded-2xl border bg-card p-3 text-[10px] shadow-sm">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="bg-muted/40 aspect-square rounded-md p-1">
                  {i + 1}
                  {i === 10 || i === 17 ? (
                    <div className="mt-1 h-1.5 rounded bg-sky-400" />
                  ) : null}
                </div>
              ))}
            </div>
          </Showcase>
          <Showcase
            reverse
            title="Publishing results"
            body="Inspect every destination status, read normalized errors, and retry only the accounts that failed."
          >
            <div className="space-y-2 rounded-2xl border bg-card p-4 text-sm shadow-sm">
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span>@creator_one</span>
                <span className="text-xs text-emerald-700">Published</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 px-3 py-2">
                <span>@brand_account</span>
                <span className="text-xs text-red-700">Failed · Retry</span>
              </div>
            </div>
          </Showcase>
        </section>

        <section className="border-y bg-[oklch(0.28_0.05_210)] text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight">
              Ready to simplify your publishing workflow?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/70">
              Connect your accounts and manage your content from one place.
            </p>
            <Link href="/register" className="mt-7 inline-block">
              <Button size="lg" className="bg-white text-[oklch(0.28_0.05_210)] hover:bg-white/90">
                Get started
              </Button>
            </Link>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">FAQ</h2>
          <div className="mt-6">
            {FAQS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <MastPlayerLogo />
            <p className="text-muted-foreground mt-3 max-w-xs text-sm leading-relaxed">
              Upload once. Publish everywhere. Schedule anything.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-medium">Product</p>
            <div className="text-muted-foreground mt-3 flex flex-col gap-2">
              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
              <Link href="/login">Login</Link>
              <Link href="/register">Get Started</Link>
            </div>
          </div>
          <div className="text-sm">
            <p className="font-medium">Legal</p>
            <div className="text-muted-foreground mt-3 flex flex-col gap-2">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <a href="mailto:support@mastplayer.in">support@mastplayer.in</a>
            </div>
          </div>
        </div>
        <div className="text-muted-foreground border-t py-4 text-center text-xs">
          © {new Date().getFullYear()} MastPlayer.
        </div>
      </footer>
    </div>
  );
}
