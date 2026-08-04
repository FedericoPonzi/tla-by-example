/**
 * @jest-environment jsdom
 */
import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import TlcOutputPanel from "@/components/TlcOutputPanel";
import type { TlcRunnerState } from "@/lib/useTlcRunner";

// TlcOutputPanel is controlled for outputOpen (the parent hook owns that bit of
// state) but owns its own height state internally. A frozen object literal for
// `runner` can't round-trip a toggle click back into a re-render, so this
// harness mirrors the real parent: it holds outputOpen in useState and wires
// setOutputOpen back into the panel, exactly like useTlcRunner's consumers do.
function Harness({
  initialOpen = true,
  rawOutput = "TLC output line 1",
}: {
  initialOpen?: boolean;
  rawOutput?: string;
}) {
  const [outputOpen, setOutputOpen] = useState(initialOpen);

  const runner: TlcRunnerState = {
    rawOutput,
    isRunning: false,
    isReady: true,
    outputOpen,
    setOutputOpen,
    run: jest.fn(),
  };

  return <TlcOutputPanel runner={runner} />;
}

// The root is the outermost element TlcOutputPanel returns. Anchoring off the
// toggle button's parent survives the approved restructure (root becomes
// `flex flex-col` with separator/header/content children) better than an
// index-based container query would, since the button stays a direct child.
function getPanelRoot() {
  return screen.getByRole("button", { name: /TLC Output/i }).parentElement as HTMLElement;
}

describe("TlcOutputPanel", () => {
  const originalInnerHeight = window.innerHeight;

  afterEach(() => {
    Object.defineProperty(window, "innerHeight", {
      value: originalInnerHeight,
      writable: true,
      configurable: true,
    });
  });

  it("collapses to COLLAPSED (32px) when the toggle is clicked while open", () => {
    render(<Harness initialOpen={true} />);
    const root = getPanelRoot();

    fireEvent.click(screen.getByRole("button", { name: /TLC Output/i }));

    expect(root.style.height).toBe("32px");
  });

  it("restores the default (192px) when the toggle is clicked while collapsed", () => {
    render(<Harness initialOpen={false} />);
    const root = getPanelRoot();

    fireEvent.click(screen.getByRole("button", { name: /TLC Output/i }));

    expect(root.style.height).toBe("192px");
  });

  it("shows the output text when open, and it is absent from the DOM when collapsed", () => {
    // Toggle via the button rather than re-rendering with a different
    // `initialOpen` prop: Harness is the same mounted instance across a
    // rerender, so useState(initialOpen) would ignore the new prop value.
    render(<Harness initialOpen={true} rawOutput="TLC output line 1" />);
    expect(screen.getByText("TLC output line 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /TLC Output/i }));
    expect(screen.queryByText("TLC output line 1")).not.toBeInTheDocument();
  });

  it("dragging the handle up 100px grows the panel from 192px to 292px", () => {
    render(<Harness initialOpen={true} />);
    const root = getPanelRoot();
    const separator = screen.getByRole("separator");

    fireEvent.mouseDown(separator, { clientY: 500 });
    fireEvent.mouseMove(document, { clientY: 400 }); // moved up 100 -> delta -100 -> grows
    fireEvent.mouseUp(document);

    expect(root.style.height).toBe("292px");
  });

  it("dragging the handle down 50px shrinks the panel from 192px to 142px", () => {
    render(<Harness initialOpen={true} />);
    const root = getPanelRoot();
    const separator = screen.getByRole("separator");

    fireEvent.mouseDown(separator, { clientY: 500 });
    fireEvent.mouseMove(document, { clientY: 550 }); // moved down 50 -> delta +50 -> shrinks
    fireEvent.mouseUp(document);

    expect(root.style.height).toBe("142px");
  });

  it("clamps a huge downward drag at MIN_OPEN (64px)", () => {
    render(<Harness initialOpen={true} />);
    const root = getPanelRoot();
    const separator = screen.getByRole("separator");

    fireEvent.mouseDown(separator, { clientY: 500 });
    fireEvent.mouseMove(document, { clientY: 10500 }); // moved down 10000
    fireEvent.mouseUp(document);

    expect(root.style.height).toBe("64px");
  });

  it("clamps a huge upward drag at MAX_OPEN (innerHeight - 320)", () => {
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      writable: true,
      configurable: true,
    });

    render(<Harness initialOpen={true} />);
    const root = getPanelRoot();
    const separator = screen.getByRole("separator");

    fireEvent.mouseDown(separator, { clientY: 10500 });
    fireEvent.mouseMove(document, { clientY: 500 }); // moved up 10000
    fireEvent.mouseUp(document);

    expect(root.style.height).toBe("480px"); // 800 - 320
  });

  it("restores the last dragged height (not the default) after collapse and re-expand", () => {
    render(<Harness initialOpen={true} />);
    const root = getPanelRoot();
    const separator = screen.getByRole("separator");

    fireEvent.mouseDown(separator, { clientY: 500 });
    fireEvent.mouseMove(document, { clientY: 400 }); // up 100 -> 292px
    fireEvent.mouseUp(document);
    expect(root.style.height).toBe("292px");

    fireEvent.click(screen.getByRole("button", { name: /TLC Output/i })); // collapse
    expect(root.style.height).toBe("32px");

    fireEvent.click(screen.getByRole("button", { name: /TLC Output/i })); // re-expand
    expect(root.style.height).toBe("292px");
  });

  it("renders no resize handle while collapsed", () => {
    render(<Harness initialOpen={false} />);
    expect(screen.queryByRole("separator")).toBeNull();
  });
});
