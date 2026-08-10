import type { Metadata } from "next";
import Link from "next/link";
import { AuthScreen } from "@/app/(auth)/_components/auth-screen";
import { resolveAuthPageNext } from "@/app/(auth)/_lib/resolve-auth-page-next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  // Auth pages shouldn't compete with Landing in search results — see
  // CLAUDE.md, "Auth Metadata". robots.txt already disallows everything
  // (see app/robots.ts); this is a second, page-level signal.
  robots: { index: false, follow: false },
};

// `?next=` is where `src/proxy.ts` sends a logged-out visitor who tried
// a protected route directly — validated here (never trusted blindly;
// see lib/safe-redirect.ts) before being threaded through the form and
// the "Create an account" switch link, so the intended destination
// survives either path into the product.
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next: rawNext } = await searchParams;
  const next = await resolveAuthPageNext(rawNext);

  return (
    <AuthScreen
      title="Sign in"
      tagline="Welcome back."
      footer={
        <>
          New here?{" "}
          <Link
            href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"}
            className="text-foreground underline underline-offset-4"
          >
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm {...(next ? { next } : {})} />
    </AuthScreen>
  );
}
