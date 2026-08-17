"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordInput } from "@/components/ui/password-input";
import { type AuthErrorField, mapAuthError } from "@/lib/auth-errors";
import { authClient } from "@/lib/auth-client";

// A focused Dialog, same pattern `MediaComment`'s editor already
// establishes for "something more involved than a single toggle" — never
// inline fields permanently sitting in the Security row. Confirming a
// new password client-side (`newPassword !== confirmPassword`) avoids a
// wasted round trip for the single most common mistake; every other
// failure (wrong current password, new password too short) comes back
// from Better Auth itself via the same `mapAuthError` sign-in/sign-up
// already use, never a raw error code.
export function ChangePasswordControl() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<readonly AuthErrorField[]>([]);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(null);
    setInvalidFields([]);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setInvalidFields([]);

    if (newPassword !== confirmPassword) {
      setMessage("New passwords don't match.");
      setInvalidFields(["newPassword"]);
      return;
    }

    setIsPending(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setIsPending(false);

    if (error) {
      const mapped = mapAuthError(error.code, error);
      setMessage(mapped.message);
      setInvalidFields(mapped.fields);
      return;
    }

    setOpen(false);
    reset();
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Change password
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="current-password" className="text-sm font-medium">
                Current password
              </label>
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                aria-invalid={invalidFields.includes("currentPassword") ? true : undefined}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="text-sm font-medium">
                New password
              </label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-invalid={invalidFields.includes("newPassword") ? true : undefined}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm new password
              </label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={invalidFields.includes("newPassword") ? true : undefined}
              />
            </div>

            {message ? (
              <p role="alert" className="text-sm text-destructive">
                {message}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="submit" loading={isPending}>
                Update password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
