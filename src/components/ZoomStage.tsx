import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

const MAX_SCALE = 8;
const TAP_SLOP = 6; // px: darunter zählt eine Berührung als Tap, nicht als Verschieben

interface ZoomStageProps {
  /** Ändert sich der Key (neues Duell), wird der Zoom zurückgesetzt. */
  resetKey: string;
  /** Tap/Klick ohne Verschieben (auch Enter/Space). */
  onTap: () => void;
  label: string;
  children: ReactNode;
}

/**
 * Zoom & Pan wie bei Google Maps: Pinch (Touch), Mausrad / Trackpad-Pinch (Strg+Rad) zoomt zum
 * Zeiger, Ziehen verschiebt. Transform wird direkt am DOM gesetzt (kein Re-Render pro Bewegung).
 */
export function ZoomStage({ resetKey, onTap, label, children }: ZoomStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const view = useRef({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: false, multi: false, startX: 0, startY: 0 });

  const apply = () => {
    const root = rootRef.current;
    const layer = layerRef.current;
    if (!root || !layer) return;
    const { w, h } = { w: root.clientWidth, h: root.clientHeight };
    const v = view.current;
    v.scale = Math.min(Math.max(v.scale, 1), MAX_SCALE);
    // Inhalt darf den Rahmen nie verlassen
    v.x = v.scale === 1 ? 0 : Math.min(0, Math.max(w - w * v.scale, v.x));
    v.y = v.scale === 1 ? 0 : Math.min(0, Math.max(h - h * v.scale, v.y));
    layer.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.scale})`;
    root.dataset.zoomed = String(v.scale > 1);
  };

  const zoomAt = (cx: number, cy: number, factor: number) => {
    const v = view.current;
    const next = Math.min(Math.max(v.scale * factor, 1), MAX_SCALE);
    const k = next / v.scale;
    v.x = cx - (cx - v.x) * k;
    v.y = cy - (cy - v.y) * k;
    v.scale = next;
    apply();
  };

  const local = (clientX: number, clientY: number) => {
    const r = rootRef.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  // Neues Duell => Zoom zurück
  useEffect(() => {
    view.current = { scale: 1, x: 0, y: 0 };
    apply();
  }, [resetKey]);

  // Wheel muss non-passive registriert werden, damit preventDefault die Seite nicht mitzoomt/scrollt.
  useEffect(() => {
    const root = rootRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = local(e.clientX, e.clientY);
      zoomAt(x, y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)));
    };
    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      gesture.current = { moved: false, multi: false, startX: e.clientX, startY: e.clientY };
    } else {
      gesture.current.multi = true;
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId);
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);

    if (pointers.current.size === 1) {
      const g = gesture.current;
      if (Math.hypot(cur.x - g.startX, cur.y - g.startY) > TAP_SLOP) g.moved = true;
      if (g.moved && view.current.scale > 1) {
        view.current.x += cur.x - prev.x;
        view.current.y += cur.y - prev.y;
        apply();
      }
    } else if (pointers.current.size === 2 && others[0]) {
      const o = others[0][1];
      const midPrev = local((prev.x + o.x) / 2, (prev.y + o.y) / 2);
      const midNow = local((cur.x + o.x) / 2, (cur.y + o.y) / 2);
      const distPrev = Math.hypot(prev.x - o.x, prev.y - o.y) || 1;
      const distNow = Math.hypot(cur.x - o.x, cur.y - o.y);
      view.current.x += midNow.x - midPrev.x;
      view.current.y += midNow.y - midPrev.y;
      zoomAt(midNow.x, midNow.y, distNow / distPrev);
    }
  };

  const onPointerEnd = (e: PointerEvent) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (pointers.current.size === 0 && e.type === 'pointerup' && !g.moved && !g.multi) onTap();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTap();
    }
  };

  return (
    <div
      ref={rootRef}
      className="stage"
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      <div ref={layerRef} className="stage__layer">
        {children}
      </div>
    </div>
  );
}
