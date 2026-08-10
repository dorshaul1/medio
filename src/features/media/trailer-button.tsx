"use client";

import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Trailer } from "@/server/media/types";

// The one client boundary a trailer needs — shared by Movie and Show
// Details rather than two video-player implementations. Radix's Dialog
// only mounts DialogContent (and therefore this iframe) into the DOM
// while open, so the YouTube player is never requested until the user
// actually asks for it — no autoplay, no preloading a video most
// visitors won't watch.
export function TrailerButton({ trailer, title }: { trailer: Trailer; title: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Play className="fill-current" />
          Play trailer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        {/* Visually hidden — Radix requires an accessible dialog title;
            the video itself is the content, so this isn't shown. The
            default Close button stays on the dialog's own padded surface
            (not on top of the video) so it keeps reliable contrast in
            both themes, rather than needing a fixed-color override like
            MediaRowScroller's overlay controls. */}
        <DialogTitle className="sr-only">{`${title} trailer: ${trailer.name}`}</DialogTitle>
        <div className="relative mt-2 aspect-video overflow-hidden rounded-lg bg-black">
          <iframe
            key={trailer.key}
            src={`https://www.youtube-nocookie.com/embed/${trailer.key}?rel=0`}
            title={trailer.name}
            className="absolute inset-0 size-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
