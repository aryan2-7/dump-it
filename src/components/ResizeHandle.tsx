import { useCallback, useRef } from "react";

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  className?: string;
}

export function ResizeHandle({ onResize, className = "" }: ResizeHandleProps) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      lastX.current = e.clientX;
      document.body.classList.add("is-resizing");

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!dragging.current) return;
        const delta = moveEvent.clientX - lastX.current;
        lastX.current = moveEvent.clientX;
        onResize(delta);
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.body.classList.remove("is-resizing");
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [onResize],
  );

  return (
    <div
      className={`resize-handle ${className}`.trim()}
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize pane"
    />
  );
}
