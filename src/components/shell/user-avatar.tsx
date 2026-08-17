import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/initials";

// Decorative by design (`alt=""`) — every place this renders sits right
// next to the user's own name as real text (or the containing control
// carries its own precise accessible name, e.g. "Open account settings
// for Dor Shaul" — see `UserIdentityLink`), so a screen reader
// announcing the image separately would just repeat the same identity
// twice. Falls back to initials on a missing/broken image or no image at
// all — Better Auth's `image` is normally absent for an email/password
// account, which is the only kind this app currently creates.
export function UserAvatar({
  name,
  image,
  size,
}: {
  name: string;
  image: string | null;
  size?: "sm" | "lg";
}) {
  return (
    <Avatar size={size}>
      {image ? <AvatarImage src={image} alt="" /> : null}
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
