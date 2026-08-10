import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Home's one entry point into the Pick decision engine (see
// docs/recommendations.md) — a restrained icon+text action in the page
// header, not a banner or a promoted section: Pick is a deliberate,
// occasional "help me decide" action, not something competing for
// attention on every Home visit. Deliberately not a primary nav
// destination either (see CLAUDE.md, "Application shell").
export function PickEntryPoint() {
  return (
    <Button asChild variant="outline">
      <Link href="/pick">
        <Sparkles /> Pick for me
      </Link>
    </Button>
  );
}
