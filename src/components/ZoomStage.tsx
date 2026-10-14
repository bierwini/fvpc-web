import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import type { ImageId } from '../tournament/types';

const MAX_ZOOM = 8; // relativ zur Basisgröße (Fit bzw. Fill)
const TAP_SLOP = 6; // px: darunter zählt eine Berührung als Tap, nicht als Verschieben

/** fill = Fenster komplett füllen (Bild wird beschnitten), fit = Bild komplett sichtbar. */
export type FitMode = 'fit' | 'fill';

export interface ZoomStageHandle {
  /** Zoom des angezeigten Bildes zurück auf die Basisgröße (Fit bzw. Fill). */
  resetZoom: () => void;
  /** Zoom + Ausschnitt des anderen Bildes auf das angezeigte Bild übertragen. */
  syncFromOther: () => void;
}

/** Zoom-Zustand des angezeigten Bildes für den Fit/Fill-Button. */
export interface ZoomInfo {
  zoomed: boolean;
  /** Bild ist mindestens so groß wie im Fill-Modus (im Fill-Modus also immer, sobald gezoomt). */
  reachesFill: boolean;
}

interface ZoomStageProps {
  mode: FitMode;
  /** Ändert sich der Key (neues Duell), werden alle Zoom-Zustände verworfen. */
  resetKey: string;
  activeId: ImageId;
  otherId: ImageId;
  /** Tap/Klick ohne Verschieben (auch Enter/Space). */
  onTap: () => void;
  onZoomChange: (info: ZoomInfo) => void;
  label: string;
  /** Bilder mit `data-image-id`; Größe/Position steuert das CSS über data-mode. */
  children: ReactNode;
}

/** Zoom-Zustand eines Bildes: Skalierung relativ zur Basisgröße, Verschiebung in px zur Fenstermitte. */
interface View {
  z: number;
  tx: number;
  ty: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/**
 * Zoom & Pan wie bei Google Maps: Pinch (Touch), Mausrad / Trackpad-Pinch (Strg+Rad) zoomt zum
 * Zeiger, Ziehen verschiebt. Jedes Bild des Duells hat seinen eigenen Zoom-Zustand.
 * Das Transform wird direkt am DOM gesetzt (kein Re-Render pro Bewegung).
 */
export const ZoomStage = forwardRef<ZoomStageHandle, ZoomStageProps>(function ZoomStage(
  { mode, resetKey, activeId, otherId, onTap, onZoomChange, label, children },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const views = useRef(new Map<ImageId, View>());
  const lastInfo = useRef('');
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: false, multi: false, startX: 0, startY: 0 });
  // Aktuelle Props für die Callbacks unten, die bewusst nur einmal angelegt werden.
  const latest = useRef({ activeId, otherId, onZoomChange, mode });
  latest.current = { activeId, otherId, onZoomChange, mode };

  const getView = useCallback((id: ImageId): View => {
    let v = views.current.get(id);
    if (!v) {
      v = { z: 1, tx: 0, ty: 0 };
      views.current.set(id, v);
    }
    return v;
  }, []);

  /** Angezeigte Größe eines Bildes in der Basisansicht (ohne Zoom). */
  const imageSize = useCallback((id: ImageId) => {
    const el = layerRef.current?.querySelector<HTMLElement>(`[data-image-id="${id}"]`);
    return { w: el?.offsetWidth ?? 0, h: el?.offsetHeight ?? 0 };
  }, []);

  /** Das Bild darf das Fenster nie "verlassen"; ist es kleiner als das Fenster, bleibt es zentriert. */
  const clampView = useCallback(
    (id: ImageId, v: View) => {
      const root = rootRef.current;
      if (!root) return;
      const { w, h } = imageSize(id);
      v.z = clamp(v.z, 1, MAX_ZOOM);
      const limitX = Math.max(0, (v.z * w - root.clientWidth) / 2);
      const limitY = Math.max(0, (v.z * h - root.clientHeight) / 2);
      v.tx = clamp(v.tx, -limitX, limitX);
      v.ty = clamp(v.ty, -limitY, limitY);
    },
    [imageSize],
  );

  const apply = useCallback(() => {
    const root = rootRef.current;
    const layer = layerRef.current;
    if (!root || !layer) return;
    const id = latest.current.activeId;
    const v = getView(id);
    clampView(id, v);
    layer.style.transform = `translate(${v.tx}px, ${v.ty}px) scale(${v.z})`;
    const zoomed = v.z > 1;
    root.dataset.zoomed = String(zoomed);

    // Faktor, ab dem das Bild so groß ist wie im Fill-Modus (im Fill-Modus selbst 1).
    const { w, h } = imageSize(id);
    const fillFactor =
      latest.current.mode === 'fill' || !w || !h ? 1 : Math.max(root.clientWidth / w, root.clientHeight / h);
    const info: ZoomInfo = { zoomed, reachesFill: zoomed && v.z >= fillFactor - 0.01 };
    const key = `${info.zoomed}|${info.reachesFill}`;
    if (key !== lastInfo.current) {
      lastInfo.current = key;
      latest.current.onZoomChange(info);
    }
  }, [clampView, getView, imageSize]);

  /** Zoom um einen Punkt (relativ zur Fenstermitte), der dabei unter dem Finger/Zeiger bleibt. */
  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number) => {
      const v = getView(latest.current.activeId);
      const next = clamp(v.z * factor, 1, MAX_ZOOM);
      const k = next / v.z;
      v.tx = cx - (cx - v.tx) * k;
      v.ty = cy - (cy - v.ty) * k;
      v.z = next;
      apply();
    },
    [apply, getView],
  );

  const toCenter = useCallback((clientX: number, clientY: number) => {
    const r = rootRef.current!.getBoundingClientRect();
    return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      resetZoom() {
        const v = getView(latest.current.activeId);
        v.z = 1;
        v.tx = 0;
        v.ty = 0;
        apply();
      },
      syncFromOther() {
        const { activeId: to, otherId: from } = latest.current;
        const source = getView(from);
        const target = getView(to);
        const s = imageSize(from);
        const t = imageSize(to);
        // Gemeinsamer Nenner: welcher Bildpunkt (0..1) liegt in der Fenstermitte? Dadurch stimmt der
        // Ausschnitt auch bei unterschiedlichen Seitenverhältnissen.
        const u = s.w ? 0.5 - source.tx / (source.z * s.w) : 0.5;
        const w = s.h ? 0.5 - source.ty / (source.z * s.h) : 0.5;
        target.z = source.z;
        target.tx = -(u - 0.5) * source.z * t.w;
        target.ty = -(w - 0.5) * source.z * t.h;
        apply();
      },
    }),
    [apply, getView, imageSize],
  );

  // Layout-Effekte laufen vor dem Paint: kein Frame, in dem ein Bild mit dem Zoom des anderen steht.
  // Anderes Bild wird angezeigt => dessen eigenen Zoom-Zustand anwenden.
  useLayoutEffect(apply, [activeId, apply]);

  // Neues Duell oder Fit/Fill-Wechsel => alle Zoom-Zustände verwerfen (Basisgröße ändert sich).
  useLayoutEffect(() => {
    views.current.clear();
    apply();
  }, [resetKey, mode, apply]);

  useEffect(() => {
    const root = rootRef.current!;
    const observer = new ResizeObserver(apply);
    observer.observe(root);
    // Wheel muss non-passive registriert werden, damit preventDefault die Seite nicht mitzoomt/scrollt.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = toCenter(e.clientX, e.clientY);
      zoomAt(x, y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)));
    };
    root.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      root.removeEventListener('wheel', onWheel);
    };
  }, [apply, toCenter, zoomAt]);

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
      if (g.moved) {
        // Verschieben ist auch ohne Zoom möglich, wenn das Bild (Fill) über das Fenster hinausragt.
        const v = getView(latest.current.activeId);
        v.tx += cur.x - prev.x;
        v.ty += cur.y - prev.y;
        apply();
      }
    } else if (pointers.current.size === 2 && others[0]) {
      const o = others[0][1];
      const midPrev = toCenter((prev.x + o.x) / 2, (prev.y + o.y) / 2);
      const midNow = toCenter((cur.x + o.x) / 2, (cur.y + o.y) / 2);
      const distPrev = Math.hypot(prev.x - o.x, prev.y - o.y) || 1;
      const distNow = Math.hypot(cur.x - o.x, cur.y - o.y);
      const v = getView(latest.current.activeId);
      v.tx += midNow.x - midPrev.x;
      v.ty += midNow.y - midPrev.y;
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
      data-mode={mode}
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
});
