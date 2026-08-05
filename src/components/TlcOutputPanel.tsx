"use client";

import { useCallback, useEffect, useState } from "react";
import ResizableDivider from "@/components/ResizableDivider";
import type { TlcRunnerState } from "@/lib/useTlcRunner";

interface TlcOutputPanelProps {
  runner: TlcRunnerState;
}

const COLLAPSED = 32;
const DEFAULT_OPEN = 192;
const MIN_OPEN = 64;

// Surrounding chrome (Navbar ~53px + Footer ~69px + Playground tab bar ~37px)
// plus a ~160px editor floor, so the editor keeps usable room. Shared by the
// drag handler and the window resize listener so they can't drift apart.
function getMaxOpen() {
  return Math.max(MIN_OPEN, window.innerHeight - 320);
}

export default function TlcOutputPanel({ runner }: TlcOutputPanelProps) {
  const [openHeight, setOpenHeight] = useState(DEFAULT_OPEN);
  const [isDragging, setIsDragging] = useState(false);

  const handleResize = useCallback((delta: number) => {
    // Dragging up moves clientY (and thus delta) negative; growing the panel
    // means subtracting delta, not adding it.
    setOpenHeight((h) => Math.min(getMaxOpen(), Math.max(MIN_OPEN, h - delta)));
  }, []);

  // Re-clamp the remembered height if the viewport shrinks after a drag.
  useEffect(() => {
    const handleWindowResize = () => setOpenHeight((h) => Math.min(getMaxOpen(), h));
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  const height = runner.outputOpen ? openHeight : COLLAPSED;

  return (
    <div
      className={`flex flex-col flex-shrink-0 bg-gray-50 ${runner.outputOpen ? "" : "border-t border-gray-200"} ${isDragging ? "" : "transition-all duration-300"}`}
      style={{ height: `${height}px` }}
    >
      {runner.outputOpen && (
        <ResizableDivider
          direction="vertical"
          onResize={handleResize}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          ariaLabel="Resize TLC output panel"
        />
      )}
      <button
        onClick={() => runner.setOutputOpen(!runner.outputOpen)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 flex-shrink-0"
      >
        <span className={`transition-transform ${runner.outputOpen ? "rotate-180" : ""}`}>▼</span>
        TLC Output
      </button>
      {runner.outputOpen && (
        <div className="flex-1 min-h-0 overflow-auto px-3 pb-2">
          <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
            {runner.rawOutput || "Press ▶ Run TLC to check the model."}
          </pre>
        </div>
      )}
    </div>
  );
}
