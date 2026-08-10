// Application-owned planning models — see docs/library.md. `MediaType` is
// reused from `server/media/types` (the same "movie"/"show" discriminant
// used everywhere else); the schema layer keeps its own literal enum
// rather than importing it, so `server/db/schema/` stays independent of
// the domain layer (see docs/architecture.md).
import type { MediaType } from "@/server/media/types";

export type PlanningIntent = "watchlist" | "backlog";

export type PlanningItem = {
  mediaType: MediaType;
  mediaProviderId: number;
  intent: PlanningIntent;
  createdAt: Date;
  updatedAt: Date;
};
