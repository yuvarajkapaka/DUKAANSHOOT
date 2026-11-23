"use client";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Pinch-to-zoom (two fingers), double-tap to zoom, drag to pan when zoomed.
 * Calls onSwipe(-1|1) for a horizontal swipe while NOT zoomed.
 */
export function Zoomable({ children, onSwipe, onSwipeDown, className }: { children: React.ReactNode; onSwipe?: (dir: -1 | 1) => void; onSwipeDown?: () => void; className?: string }) {
  const [s, setS] = useState({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number; start: { x: number; y: number }; base: { x: number; y: number } } | null>(null);
  const lastTap = useRef(0);

  const dist = () => {
    const [a, b] = Array.from(pointers.current.values());
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  return (
    <div
      className={cn("relative touch-none overflow-hidden", className)}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        gesture.current = { dist: pointers.current.size === 2 ? dist() : 0, scale: s.scale, start: { x: e.clientX, y: e.clientY }, base: { x: s.x, y: s.y } };
        const now = Date.now();
        if (now - lastTap.current < 280 && pointers.current.size === 1) setS((p) => (p.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 }));
        lastTap.current = now;
      }}
      onPointerMove={(e) => {
        if (!pointers.current.has(e.pointerId) || !gesture.current) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const g = gesture.current;
        if (pointers.current.size === 2) {
          if (!g.dist) g.dist = dist();
          setS((p) => ({ ...p, scale: Math.max(1, Math.min(4, (g.scale * dist()) / g.dist)) }));
        } else if (s.scale > 1) {
          setS((p) => ({ ...p, x: g.base.x + (e.clientX - g.start.x), y: g.base.y + (e.clientY - g.start.y) }));
        }
      }}
      onPointerUp={(e) => {
        const g = gesture.current;
        pointers.current.delete(e.pointerId);
        if (g && pointers.current.size === 0 && s.scale <= 1.02) {
          const dx = e.clientX - g.start.x;
          const dy = e.clientY - g.start.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) onSwipe?.(dx < 0 ? 1 : -1);
          else if (dy > 120) onSwipeDown?.();
          setS({ scale: 1, x: 0, y: 0 });
        }
      }}
      onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
    >
      <div className="size-full transition-transform duration-150 ease-out will-change-transform" style={{ transform: `translate(${s.x}px, ${s.y}px) scale(${s.scale})` }}>
        {children}
      </div>
    </div>
  );
}
