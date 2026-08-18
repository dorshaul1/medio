import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useOptimisticChoice } from "./use-optimistic-choice";

describe("useOptimisticChoice", () => {
  it("updates the visible selection immediately, before the write resolves", () => {
    const onChange = vi.fn(() => new Promise<void>(() => {}));
    const { result } = renderHook(() => useOptimisticChoice<string>("a", onChange));

    act(() => result.current.select("b"));

    expect(result.current.current).toBe("b");
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("rolls back to the previous value when the write fails", async () => {
    const onChange = vi.fn(() => Promise.reject(new Error("nope")));
    const { result } = renderHook(() => useOptimisticChoice<string>("a", onChange));

    act(() => result.current.select("b"));
    expect(result.current.current).toBe("b");

    await waitFor(() => expect(result.current.current).toBe("a"));
  });

  it("never lets a stale failed request roll back a newer selection", async () => {
    let rejectFirst: (() => void) | undefined;
    const onChange = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_, reject) => {
            rejectFirst = () => reject(new Error("nope"));
          }),
      )
      .mockImplementationOnce(() => Promise.resolve());

    const { result } = renderHook(() => useOptimisticChoice<string>("a", onChange));

    act(() => result.current.select("b"));
    act(() => result.current.select("c"));
    expect(result.current.current).toBe("c");

    act(() => rejectFirst?.());

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
    expect(result.current.current).toBe("c");
  });
});
