"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";

// A Server Component (DesignSystemPage) can't pass an event handler prop
// straight to a Client Component — `onValueChange` has to originate from
// a real client boundary. This one-off wrapper gives `/design-system`'s
// own SegmentedControl example real local state instead of a no-op, the
// same live-interaction standard as the Checkbox/Switch/Tabs rows above it.
export function SegmentedControlDemo() {
  const [value, setValue] = useState("movie");

  return (
    <SegmentedControl
      value={value}
      ariaLabel="Format"
      options={[
        { value: "any", label: "Any" },
        { value: "movie", label: "Movie" },
        { value: "show", label: "Show" },
      ]}
      onValueChange={setValue}
    />
  );
}
