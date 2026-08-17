import type { Metadata } from "next";
import Link from "next/link";
import { AuthScreen } from "@/app/(auth)/_components/auth-screen";
import { resolveAuthPageNext } from "@/app/(auth)/_lib/resolve-auth-page-next";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { next: rawNext } = await searchParams;
  const next = await resolveAuthPageNext(rawNext);

  return (
    <AuthScreen
      title="Create account"
      tagline="Track what you watch. Know what's next."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"}
            className="text-foreground underline underline-offset-4"
          >
            Log in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthScreen>
  );
}
