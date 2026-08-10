import { Clapperboard, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { mediaHref } from "@/features/media/media-route";
import type { PersonFilmographyEntry } from "@/server/people/types";
import { posterUrl } from "@/server/tmdb/images";

// A dense, scannable list row — the same "plain divided list, no per-item
// card" language as EpisodeList/EpisodeRow, chosen over poster-led cards
// here because a career can run to dozens or hundreds of credits (see
// docs/media-provider.md, "Filmography presentation"). A small poster
// thumbnail (not full-size) keeps rows compact on mobile while still
// giving each title a visual anchor.
export function PersonFilmographyRow({ entry }: { entry: PersonFilmographyEntry }) {
  const poster = posterUrl(entry.poster, "small");
  const Icon = entry.mediaType === "movie" ? Clapperboard : Tv;
  const meta = [
    entry.context,
    entry.episodeCount ? pluralizeEpisodes(entry.episodeCount) : null,
  ].filter((part): part is string => part !== null && part.length > 0);

  return (
    <li className="flex items-center gap-3 py-2.5">
      <Link
        href={mediaHref({ mediaType: entry.mediaType, id: entry.mediaProviderId })}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="relative aspect-2/3 w-10 shrink-0 overflow-hidden rounded-sm bg-surface-subtle">
          {poster ? (
            <>
              <Image src={poster} alt="" fill sizes="40px" className="object-cover" />
              {/* A small corner badge, not just the poster-missing fallback
                  icon — otherwise movie vs. show is only distinguishable
                  when a poster happens to be missing (a real gap found in
                  visual review: e.g. "Wuthering Heights" gives no cue
                  whether it's a movie or a series). A fixed dark scrim, not
                  a theme token — same "floats over unpredictable artwork"
                  precedent as PartOfCollectionRow's poster tiles. */}
              <div className="absolute right-0 bottom-0 flex size-3.5 items-center justify-center rounded-tl-sm bg-black/60">
                <Icon aria-hidden="true" strokeWidth={2} className="size-2.5 text-white" />
              </div>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon
                aria-hidden="true"
                strokeWidth={1.25}
                className="size-4 text-muted-foreground/60"
              />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="line-clamp-1 text-sm font-medium text-foreground transition-colors group-hover:text-foreground/80 group-focus-visible:text-foreground/80">
            {entry.title}
          </p>
          {meta.length > 0 ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">{meta.join(" · ")}</p>
          ) : null}
        </div>
      </Link>
      <span className="shrink-0 text-xs text-muted-foreground">{entry.year ?? ""}</span>
    </li>
  );
}

function pluralizeEpisodes(count: number): string {
  return `${count} episode${count === 1 ? "" : "s"}`;
}
