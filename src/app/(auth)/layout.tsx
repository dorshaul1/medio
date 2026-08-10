import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";

// Shared by /sign-in and /sign-up: an already-authenticated visitor never
// sees an auth form — no flash, decided server-side before anything renders.
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const session = await getCurrentSession();

  if (session) {
    redirect("/");
  }

  return children;
}
