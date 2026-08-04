"use client";

import { useCallback, useRef } from "react";

interface ResizableDividerProps {
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  ariaLabel?: string;
}

export default function ResizableDivider({
  direction,
  onResize,
  onDragStart,
  onDragEnd,
  ariaLabel = "Resize panel",
}: ResizableDividerProps) {
  const dragging = useRef(false);
  const lastPos = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastPos.current = direction === "horizontal" ? e.clientX : e.clientY;
    onDragStart?.();

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const pos = direction === "horizontal" ? ev.clientX : ev.clientY;
      const delta = pos - lastPos.current;
      lastPos.current = pos;
      onResize(delta);
    };

    // Shared by mouseup and a missed-mouseup window blur; the dragging.current
    // guard makes it idempotent so whichever fires second is a no-op.
    const endDrag = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", endDrag);
      window.removeEventListener("blur", endDrag);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      onDragEnd?.();
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", endDrag);
    window.addEventListener("blur", endDrag);
    document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }, [direction, onResize, onDragStart, onDragEnd]);

  const isH = direction === "horizontal";
  // direction describes which way the handle moves; aria-orientation describes
  // the separator line itself, which runs perpendicular to that movement.
  const ariaOrientation = isH ? "vertical" : "horizontal";

  return (
    <div
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation={ariaOrientation}
      aria-label={ariaLabel}
      style={{
        width: isH ? "4px" : "100%",
        height: isH ? "100%" : "4px",
        cursor: isH ? "col-resize" : "row-resize",
        backgroundColor: "transparent",
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
      }}
    >
      <div style={{
        position: "absolute",
        [isH ? "left" : "top"]: "1px",
        [isH ? "top" : "left"]: 0,
        [isH ? "width" : "height"]: "2px",
        [isH ? "height" : "width"]: "100%",
        backgroundColor: "#e5e7eb",
        transition: "background-color 0.15s",
      }} />
    </div>
  );
}
