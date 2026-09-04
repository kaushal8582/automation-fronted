"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { MastPlayerLogo } from "@/components/shared/mastplayer-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

function AuthBrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-[oklch(0.28_0.05_210)] lg:flex lg:w-[48%] lg:flex-col lg:justify-between lg:p-10 xl:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, oklch(0.55 0.1 210 / 0.5), transparent 40%), radial-gradient(circle at 80% 80%, oklch(0.45 0.08 180 / 0.35), transparent 35%)",
        }}
      />
      <MastPlayerLogo className="relative z-10 text-white [&_span:last-child]:text-white" />
      <div className="relative z-10 max-w-md space-y-6 text-white">
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          Your content.
          <br />
          Everywhere it matters.
        </h1>
        <p className="text-white/70 text-sm leading-relaxed">
          Connect Instagram and Facebook Pages, upload once, and publish or schedule across every
          account from one place.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { t: "Instagram", d: "Professional accounts" },
            { t: "Facebook", d: "Pages you manage" },
            { t: "Schedule", d: "Publish at the right time" },
            { t: "Status", d: "Track every destination" },
          ].map((item) => (
            <div
              key={item.t}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm"
            >
              <p className="font-medium">{item.t}</p>
              <p className="text-white/55 text-xs">{item.d}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="relative z-10 text-xs text-white/40">MastPlayer Social Publisher</p>
    </div>
  );
}

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      toast.success("Welcome back");
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Incorrect email or password";
      setFormError(message);
      toast.error(message);
    }
  });

  return (
    <div className="flex min-h-svh">
      <AuthBrandPanel />
      <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <MastPlayerLogo />
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 space-y-1">
              <p className="text-muted-foreground text-sm">Welcome back</p>
              <h2 className="text-2xl font-semibold tracking-tight">Sign in to MastPlayer</h2>
            </div>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="h-10"
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="text-destructive text-sm">{errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-10 pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-destructive text-sm">{errors.password.message}</p>
                ) : null}
              </div>
              {formError ? (
                <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
                  {formError}
                </p>
              ) : null}
              <Button className="h-10 w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            <p className="text-muted-foreground mt-6 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link className="text-foreground font-medium underline-offset-4 hover:underline" href="/register">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
