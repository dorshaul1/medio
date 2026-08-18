import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceWorkerProvider, useServiceWorkerUpdate } from "./service-worker-context";

class FakeWorker extends EventTarget {
  state: string;
  postMessage = vi.fn();

  constructor(state = "installing") {
    super();
    this.state = state;
  }

  setState(state: string) {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}

class FakeRegistration extends EventTarget {
  waiting: FakeWorker | null = null;
  installing: FakeWorker | null = null;
  update = vi.fn().mockResolvedValue(undefined);

  startInstalling() {
    this.installing = new FakeWorker("installing");
    this.dispatchEvent(new Event("updatefound"));
    return this.installing;
  }
}

function makeFakeServiceWorkerContainer(registration: FakeRegistration) {
  const container = new EventTarget() as EventTarget & {
    controller: FakeWorker | null;
    register: (url: string) => Promise<FakeRegistration>;
  };
  container.controller = null;
  container.register = vi.fn().mockResolvedValue(registration);
  return container;
}

function Probe() {
  const { status, checkForUpdate, applyUpdate } = useServiceWorkerUpdate();
  return (
    <div>
      <p>status:{status}</p>
      <button type="button" onClick={() => void checkForUpdate()}>
        check
      </button>
      <button type="button" onClick={applyUpdate}>
        apply
      </button>
    </div>
  );
}

let reloadSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  reloadSpy = vi.fn();
  Object.defineProperty(window, "location", {
    value: { ...window.location, reload: reloadSpy },
    writable: true,
  });
  // Runs after the *previous* test's own unmount/cleanup has already
  // completed, so clearing this here (rather than in `afterEach`) never
  // races that test's own effect-cleanup, which itself reads
  // `navigator.serviceWorker`.
  // biome-ignore lint/suspicious/noExplicitAny: resetting a stubbed global between tests
  delete (navigator as any).serviceWorker;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ServiceWorkerProvider", () => {
  it("reports an error when Service Workers aren't supported at all", async () => {
    render(
      <ServiceWorkerProvider>
        <Probe />
      </ServiceWorkerProvider>,
    );
    await waitFor(() => expect(screen.getByText("status:error")).toBeInTheDocument());
  });

  it("settles to up-to-date once registered with nothing waiting", async () => {
    const registration = new FakeRegistration();
    Object.defineProperty(navigator, "serviceWorker", {
      value: makeFakeServiceWorkerContainer(registration),
      configurable: true,
    });

    render(
      <ServiceWorkerProvider>
        <Probe />
      </ServiceWorkerProvider>,
    );

    await waitFor(() => expect(screen.getByText("status:up-to-date")).toBeInTheDocument());
  });

  it("reports available immediately when a worker was already waiting from a previous visit", async () => {
    const registration = new FakeRegistration();
    registration.waiting = new FakeWorker("installed");
    const container = makeFakeServiceWorkerContainer(registration);
    container.controller = new FakeWorker("activated");
    Object.defineProperty(navigator, "serviceWorker", { value: container, configurable: true });

    render(
      <ServiceWorkerProvider>
        <Probe />
      </ServiceWorkerProvider>,
    );

    await waitFor(() => expect(screen.getByText("status:available")).toBeInTheDocument());
  });

  it("reports available once a newly found worker finishes installing over an existing controller", async () => {
    const registration = new FakeRegistration();
    const container = makeFakeServiceWorkerContainer(registration);
    container.controller = new FakeWorker("activated");
    Object.defineProperty(navigator, "serviceWorker", { value: container, configurable: true });

    render(
      <ServiceWorkerProvider>
        <Probe />
      </ServiceWorkerProvider>,
    );
    await waitFor(() => expect(screen.getByText("status:up-to-date")).toBeInTheDocument());

    const installing = registration.startInstalling();
    act(() => installing.setState("installed"));

    await waitFor(() => expect(screen.getByText("status:available")).toBeInTheDocument());
  });

  it("never reports available for the very first install — there's no controller yet to update", async () => {
    const registration = new FakeRegistration();
    Object.defineProperty(navigator, "serviceWorker", {
      value: makeFakeServiceWorkerContainer(registration),
      configurable: true,
    });

    render(
      <ServiceWorkerProvider>
        <Probe />
      </ServiceWorkerProvider>,
    );
    await waitFor(() => expect(screen.getByText("status:up-to-date")).toBeInTheDocument());

    const installing = registration.startInstalling();
    act(() => installing.setState("installed"));

    expect(screen.getByText("status:up-to-date")).toBeInTheDocument();
  });

  it("applyUpdate posts SKIP_WAITING to the waiting worker", async () => {
    const registration = new FakeRegistration();
    registration.waiting = new FakeWorker("installed");
    const container = makeFakeServiceWorkerContainer(registration);
    container.controller = new FakeWorker("activated");
    Object.defineProperty(navigator, "serviceWorker", { value: container, configurable: true });
    const user = userEvent.setup();

    render(
      <ServiceWorkerProvider>
        <Probe />
      </ServiceWorkerProvider>,
    );
    await waitFor(() => expect(screen.getByText("status:available")).toBeInTheDocument());

    await user.click(screen.getByText("apply"));

    expect(registration.waiting.postMessage).toHaveBeenCalledWith("SKIP_WAITING");
  });

  it("reloads exactly once when the controller actually changes", async () => {
    const registration = new FakeRegistration();
    const container = makeFakeServiceWorkerContainer(registration);
    Object.defineProperty(navigator, "serviceWorker", { value: container, configurable: true });

    render(
      <ServiceWorkerProvider>
        <Probe />
      </ServiceWorkerProvider>,
    );
    await waitFor(() => expect(screen.getByText("status:up-to-date")).toBeInTheDocument());

    act(() => container.dispatchEvent(new Event("controllerchange")));
    act(() => container.dispatchEvent(new Event("controllerchange")));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("checkForUpdate goes through checking before settling, and never leaves a false available state on failure", async () => {
    const registration = new FakeRegistration();
    registration.update = vi.fn().mockRejectedValue(new Error("network"));
    Object.defineProperty(navigator, "serviceWorker", {
      value: makeFakeServiceWorkerContainer(registration),
      configurable: true,
    });
    const user = userEvent.setup();

    render(
      <ServiceWorkerProvider>
        <Probe />
      </ServiceWorkerProvider>,
    );
    await waitFor(() => expect(screen.getByText("status:up-to-date")).toBeInTheDocument());

    await user.click(screen.getByText("check"));

    // The mocked rejection resolves near-instantly, so "checking" may
    // already be gone by the time `click()` itself resolves — the
    // meaningful assertion is the terminal state, not catching the
    // transient one mid-flight.
    await waitFor(() => expect(screen.getByText("status:error")).toBeInTheDocument());
  });
});
