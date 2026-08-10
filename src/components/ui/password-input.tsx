"use client";

import { Eye, EyeOff } from "lucide-react";
import type { ComponentProps } from "react";
import { useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// A password field with a visibility toggle — its own primitive (not an
// auth-specific component) since any future form that collects a password
// needs the same behavior.
function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-10", className)} {...props} />
      <IconButton
        type="button"
        variant="ghost"
        size="sm"
        className="absolute top-1/2 right-1 -translate-y-1/2"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff /> : <Eye />}
      </IconButton>
    </div>
  );
}

export { PasswordInput };
