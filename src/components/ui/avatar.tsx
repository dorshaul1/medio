import { cva, type VariantProps } from "class-variance-authority";
import { Avatar as AvatarPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
  {
    variants: {
      size: {
        // `sm` — the account identity control in nav chrome (sidebar,
        // mobile header). `lg` — Account Settings' own identity section,
        // the one place an avatar is the visual focus rather than a
        // small wayfinding icon.
        sm: "size-7 text-xs",
        lg: "size-14 text-lg",
      },
    },
    defaultVariants: { size: "sm" },
  },
);

function Avatar({
  className,
  size,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Root> & VariantProps<typeof avatarVariants>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ size, className }))}
      {...props}
    />
  );
}

function AvatarImage(props: ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image data-slot="avatar-image" className="size-full object-cover" {...props} />
  );
}

// Radix already waits a beat before rendering this so a fast-loading
// image never flashes the fallback first (`delayMs` left at its default);
// this just supplies the visual/copy.
function AvatarFallback({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn("font-medium text-muted-foreground select-none", className)}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
