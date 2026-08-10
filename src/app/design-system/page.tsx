import { MoreHorizontal, Pencil, Settings, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RatingControlDemo } from "@/app/design-system/_components/rating-control-demo";
import { Row, Section } from "@/app/design-system/_components/section";
import { TableOfContents } from "@/app/design-system/_components/toc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Design system",
};

const SEMANTIC_COLORS = [
  { label: "Background", swatch: "bg-background border border-border" },
  { label: "Foreground", swatch: "bg-foreground" },
  { label: "Surface", swatch: "bg-surface border border-border" },
  { label: "Muted", swatch: "bg-muted" },
  { label: "Border", swatch: "bg-border" },
  { label: "Primary", swatch: "bg-primary" },
  { label: "Secondary", swatch: "bg-secondary" },
  { label: "Destructive", swatch: "bg-destructive" },
  { label: "Success", swatch: "bg-success" },
  { label: "Warning", swatch: "bg-warning" },
] as const;

const PASTELS = [
  { label: "Sage", swatch: "bg-pastel-sage" },
  { label: "Lavender", swatch: "bg-pastel-lavender" },
  { label: "Blue", swatch: "bg-pastel-blue" },
  { label: "Peach", swatch: "bg-pastel-peach" },
  { label: "Rose", swatch: "bg-pastel-rose" },
] as const;

const PRIMARY_SWATCHES = [
  { label: "primary", swatch: "bg-primary" },
  { label: "primary-hover", swatch: "bg-primary-hover" },
  { label: "primary-active", swatch: "bg-primary-active" },
  { label: "primary-subtle", swatch: "bg-primary-subtle" },
  { label: "primary-border", swatch: "bg-primary-border" },
] as const;

const SURFACES = [
  { label: "Background", swatch: "bg-background" },
  { label: "Surface", swatch: "bg-surface" },
  { label: "Surface subtle", swatch: "bg-surface-subtle" },
  { label: "Surface elevated", swatch: "bg-surface-elevated shadow-sm" },
] as const;

const RADII = [
  { label: "sm", className: "rounded-sm" },
  { label: "md", className: "rounded-md" },
  { label: "lg", className: "rounded-lg" },
  { label: "xl", className: "rounded-xl" },
] as const;

function Swatch({ label, swatch }: { label: string; swatch: string }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className={cn("size-9 rounded-md", swatch)} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// Local-only reference page — see docs/design-system.md. Not part of the
// product's navigation, and unavailable outside local development (below).
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl gap-12 px-6 py-14 sm:px-8">
      <TableOfContents />

      <main className="flex min-w-0 flex-1 flex-col gap-10">
        <header className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {siteConfig.name} — local development only
          </p>
          <h1 className="text-2xl font-medium tracking-tight">Design System</h1>
          <p className="text-sm text-muted-foreground">
            Internal UI reference. Toggle theme from Settings or your OS to inspect dark mode.
          </p>
        </header>

        <Section
          id="typography"
          title="Typography"
          description="Hierarchy comes from size, weight, and spacing together — not a long list of styles."
        >
          <div className="flex flex-col divide-y divide-border">
            <div className="py-3">
              <p className="text-2xl font-medium tracking-tight sm:text-3xl">Page title</p>
            </div>
            <div className="py-3">
              <p className="text-lg font-medium">Section title</p>
            </div>
            <div className="py-3">
              <p className="text-sm leading-relaxed">
                Body text. Easy to read at a comfortable measure, quiet by default.
              </p>
            </div>
            <div className="py-3">
              <p className="text-sm text-muted-foreground">Metadata — 2024 · 1h 48m · Drama</p>
            </div>
            <div className="py-3">
              <p className="text-sm font-medium">Control label</p>
            </div>
            <div className="py-3">
              <p className="text-xs text-muted-foreground">Caption — last watched 3 days ago</p>
            </div>
          </div>
        </Section>

        <Section
          id="colors"
          title="Colors"
          description="Semantic tokens, and the restrained pastel accent family."
        >
          <Row label="Semantic">
            {SEMANTIC_COLORS.map((c) => (
              <Swatch key={c.label} {...c} />
            ))}
          </Row>
          <Row label="Pastel accents — fills and indicators only, never text">
            {PASTELS.map((c) => (
              <Swatch key={c.label} {...c} />
            ))}
          </Row>
        </Section>

        <Section
          id="primary"
          title="Primary — Clay"
          description="The one signature accent. Used for primary actions, intentional selection, and focus — not decoration."
        >
          <Row label="Scale">
            {PRIMARY_SWATCHES.map((c) => (
              <Swatch key={c.label} {...c} />
            ))}
            <div className="flex flex-col items-start gap-1.5">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground">
                Aa
              </div>
              <span className="text-xs text-muted-foreground">primary-foreground</span>
            </div>
          </Row>
          <Row label="Where it shows up">
            <Button>Primary action</Button>
            <div className="flex items-center gap-2">
              <Checkbox aria-label="Selected" defaultChecked />
              <Switch aria-label="On" defaultChecked />
            </div>
            <Progress value={55} className="w-32" />
            <Input placeholder="Focus me" className="w-36" />
          </Row>
          <p className="text-xs text-muted-foreground">
            Not used for: body text, page titles, every icon, badges beyond "positive", borders
            around every section, or navigation/dialog/dropdown backgrounds. See
            docs/design-system.md for the full usage rules.
          </p>
        </Section>

        <Section id="surfaces" title="Surfaces & radius">
          <Row label="Surface hierarchy">
            {SURFACES.map((s) => (
              <div
                key={s.label}
                className={cn(
                  "flex h-16 w-24 items-end rounded-lg border border-border p-2.5",
                  s.swatch,
                )}
              >
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </Row>
          <Row label="Radius scale">
            {RADII.map((r) => (
              <div key={r.label} className="flex flex-col items-start gap-1.5">
                <div className={cn("size-9 border border-border bg-muted", r.className)} />
                <span className="text-xs text-muted-foreground">{r.label}</span>
              </div>
            ))}
          </Row>
        </Section>

        <Section id="actions" title="Actions">
          <Row label="Variants">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </Row>
          <Row label="Sizes">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row label="States">
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </Row>
          <Row label="Icon button — accessible name is required at the type level">
            <IconButton aria-label="Edit" variant="ghost">
              <Pencil />
            </IconButton>
            <IconButton aria-label="Settings" variant="secondary">
              <Settings />
            </IconButton>
            <IconButton aria-label="Delete" variant="ghost">
              <Trash2 />
            </IconButton>
          </Row>
        </Section>

        <Section id="form-controls" title="Form controls">
          <Row label="Input">
            <Input placeholder="Search titles…" className="w-56" />
            <Input placeholder="Invalid" aria-invalid className="w-40" />
            <Input placeholder="Disabled" disabled className="w-40" />
          </Row>
          <Row label="Password input — visibility toggle">
            <PasswordInput aria-label="Password" placeholder="Password" className="w-56" />
          </Row>
          <Row label="Textarea">
            <Textarea placeholder="Notes…" className="w-72" />
          </Row>
          <Row label="Select">
            <Select defaultValue="popular">
              <SelectTrigger aria-label="Sort by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="top_rated">Top rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </Row>
        </Section>

        <Section id="selection" title="Selection">
          <Row label="Checkbox — unchecked, checked, indeterminate, disabled">
            <Checkbox aria-label="Unchecked" />
            <Checkbox aria-label="Checked" defaultChecked />
            <Checkbox aria-label="Indeterminate" defaultChecked="indeterminate" />
            <Checkbox aria-label="Disabled" disabled />
          </Row>
          <Row label="Radio group">
            <RadioGroup defaultValue="movies" className="flex-row gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="movies" id="ds-radio-movies" />
                <label htmlFor="ds-radio-movies" className="text-sm">
                  Movies
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="shows" id="ds-radio-shows" />
                <label htmlFor="ds-radio-shows" className="text-sm">
                  Shows
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="both" id="ds-radio-both" disabled />
                <label htmlFor="ds-radio-both" className="text-sm text-muted-foreground">
                  Both
                </label>
              </div>
            </RadioGroup>
          </Row>
          <Row label="Switch">
            <Switch aria-label="Off" />
            <Switch aria-label="On" defaultChecked />
            <Switch aria-label="Disabled" disabled />
          </Row>
          <Row label="Rating control — a restrained 1-5 selector, deliberately not stars (see docs/opinions.md)">
            <RatingControlDemo initial={null} />
            <RatingControlDemo initial={4} />
          </Row>
          <Row label="Tabs">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="episodes">Episodes</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="pt-4 text-sm text-muted-foreground">
                Overview content.
              </TabsContent>
              <TabsContent value="episodes" className="pt-4 text-sm text-muted-foreground">
                Episodes content.
              </TabsContent>
              <TabsContent value="details" className="pt-4 text-sm text-muted-foreground">
                Details content.
              </TabsContent>
            </Tabs>
          </Row>
        </Section>

        <Section id="status" title="Status">
          <Row label="Badge">
            <Badge>Neutral</Badge>
            <Badge variant="positive">Watched</Badge>
            <Badge variant="warning">Airing</Badge>
            <Badge variant="negative">Removed</Badge>
            <Badge variant="accent">New</Badge>
          </Row>
        </Section>

        <Section id="loading" title="Loading">
          <Row label="Spinner">
            <Spinner />
          </Row>
          <Row label="Progress">
            <Progress value={20} className="w-56" />
            <Progress value={65} className="w-56" />
            <Progress value={100} className="w-56" />
          </Row>
          <Row label="Skeleton">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </Row>
        </Section>

        <Section id="overlays" title="Overlays">
          <Row label="Tooltip">
            <IconButton aria-label="More options" variant="ghost">
              <MoreHorizontal />
            </IconButton>
            <span className="text-xs text-muted-foreground">(hover or focus the button)</span>
          </Row>
          <Row label="Dropdown menu">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Open menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Row>
          <Row label="Popover">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Open popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-sm leading-relaxed">
                  Richer content than a tooltip, still lightweight — for things like a compact
                  filter or a short form.
                </p>
              </PopoverContent>
            </Popover>
          </Row>
          <Row label="Dialog">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove from library?</DialogTitle>
                  <DialogDescription>
                    This only removes it from your library, not the device.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button variant="destructive">Remove</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Row>
        </Section>

        <Separator />
        <p className="text-xs text-muted-foreground">
          Every primitive here lives in{" "}
          <code className="rounded-sm bg-muted px-1 py-0.5">src/components/ui/</code>. Reuse before
          recreating — see{" "}
          <code className="rounded-sm bg-muted px-1 py-0.5">docs/design-system.md</code>.
        </p>
      </main>
    </div>
  );
}
