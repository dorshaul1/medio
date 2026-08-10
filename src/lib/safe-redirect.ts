// Validates a caller-supplied "return to this path after auth" value
// before it's ever used as a redirect target — see docs/authentication.md,
// "Return URL safety". A bare `/` prefix isn't enough: `//evil.com` and
// `/\evil.com` are both browser-interpretable as protocol-relative
// external URLs despite superficially "starting with a slash", and a
// value like `/sign-in` itself would just bounce the user right back.
// Anything else (a full URL, an empty string, `javascript:`, ...) is
// rejected outright. Pure — no I/O, trivially testable.
export function isSafeReturnPath(path: string): boolean {
  if (!path) return false;
  if (!/^\/(?!\/|\\)/.test(path)) return false;
  if (path.startsWith("/sign-in") || path.startsWith("/sign-up")) return false;
  return true;
}

// Never throws — an absent/invalid `next` value silently falls back
// rather than ever becoming a 400 or, worse, a trusted-looking redirect
// that turns out to be unsafe.
export function safeReturnPath(path: string | null | undefined, fallback = "/"): string {
  return path && isSafeReturnPath(path) ? path : fallback;
}
