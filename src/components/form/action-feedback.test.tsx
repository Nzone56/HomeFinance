import { render } from "@testing-library/react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { IDLE_STATE, errorState, successState } from "@/lib/actions/state";

import { ActionFeedback } from "./action-feedback";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("ActionFeedback", () => {
  it("says nothing before anything has been submitted", () => {
    render(<ActionFeedback state={IDLE_STATE} />);

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("announces a successful save", () => {
    render(<ActionFeedback state={successState("Gasto registrado.")} />);

    expect(toast.success).toHaveBeenCalledWith("Gasto registrado.");
  });

  it("reloads the page's data after a successful save, as its own request (regression)", () => {
    // The reload used to ride inside the save's response, so a gateway timeout
    // while reloading made a saved card payment look like a failed save.
    render(<ActionFeedback state={successState("Traslado registrado.")} />);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("announces a failure", () => {
    render(<ActionFeedback state={errorState("Algo salió mal.")} />);

    expect(toast.error).toHaveBeenCalledWith("Algo salió mal.");
  });

  it("does not reload after a failure, so the form keeps what was typed", () => {
    render(<ActionFeedback state={errorState("Falló")} />);

    expect(refresh).not.toHaveBeenCalled();
  });

  it("lets the caller react to a success, to close a drawer", () => {
    const onSuccess = vi.fn();

    render(<ActionFeedback state={successState("Listo")} onSuccess={onSuccess} />);

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("does not run the success callback on a failure", () => {
    const onSuccess = vi.fn();

    render(<ActionFeedback state={errorState("Falló")} onSuccess={onSuccess} />);

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("renders nothing itself", () => {
    const { container } = render(<ActionFeedback state={IDLE_STATE} />);

    expect(container).toBeEmptyDOMElement();
  });
});
