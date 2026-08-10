import type { Metadata } from "next";
import Link from "next/link";
import { AuthScreen } from "@/app/(auth)/_components/auth-screen";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <AuthScreen
      title="Create account"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthScreen>
  );
}
