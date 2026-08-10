import type { Metadata } from "next";
import Link from "next/link";
import { AuthScreen } from "@/app/(auth)/_components/auth-screen";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <AuthScreen
      title="Sign in"
      footer={
        <>
          New here?{" "}
          <Link href="/sign-up" className="text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm />
    </AuthScreen>
  );
}
