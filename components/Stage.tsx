"use client";

import { useRef, type PointerEvent, type RefObject, type WheelEvent } from "react";

type Props = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  ratio: string;
  enabled: boolean;
  onPan: (dx: number, dy: number) => void;
  onZoom: (factor: number) => void;
};

export default function Stage({ canvasRef, ratio, enabled, onPan, onZoom }: Props) {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);

  function down(e: PointerEvent<HTMLDivElement>) {
    if (!enabled) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) pinch.current = spread();
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    if (!enabled) return;
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;

    const box = e.currentTarget.getBoundingClientRect();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2) {
      const now = spread();
      if (pinch.current > 0 && now > 0) onZoom(now / pinch.current);
      pinch.current = now;
      return;
    }

    onPan((e.clientX - prev.x) / box.width, (e.clientY - prev.y) / box.height);
  }

  function up(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = 0;
  }

  function spread() {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function wheel(e: WheelEvent<HTMLDivElement>) {
    if (!enabled) return;
    onZoom(e.deltaY < 0 ? 1.06 : 1 / 1.06);
  }

  return (
    <div
      className="relative w-full touch-none select-none overflow-hidden rounded-2xl bg-green-deep/40"
      style={{ aspectRatio: ratio, cursor: enabled ? "grab" : "default" }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={up}
      onWheel={wheel}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
