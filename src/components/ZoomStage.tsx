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

const MAX_ZOOM = 8; // relativ zur Fill-Größe; nach unten begrenzt die Fit-Größe (siehe minZoom)
const TAP_SLOP = 6; // px: darunter zählt eine Berührung als Tap, nicht als Verschieben

/**
 * Zoom 1 = Fill (Fenster komplett gefüllt, Bild beschnitten). Herauszoomen geht bis Fit (Bild komplett sichtbar); jedes Bild startet im zuletzt gewählten Modus (zuerst Fit).
 * Der Fit/Fill-Button zeigt "expand" (Pfeile nach außen, Ziel Fill) oder "collapse" (Pfeile nach innen, Ziel Fit, oder Fill beim Zurücksetzen eines Zooms über Fill).
 * Welches Icon steht, hängt vom Zoom und davon ab, ob für dieses Bild schon Fill gewählt wurde (Button oder Start im Fill-Modus).
 */
export interface FitFillButton {
  action: 'expand' | 'collapse';
  target: 'fill' | 'fit';
  /** Fit und Fill sind gleich groß: nichts zu tun. */
  disabled: boolean;
}

export interface ZoomStageHandle {
  /** Der Fit/Fill-Button wurde gedrückt: wendet seine aktuelle Aktion auf das angezeigte Bild an. */
  pressFitFill: () => void;
  /** Zoom + Ausschnitt des anderen Bildes auf das angezeigte Bild übertragen. */
  syncFromOther: () => void;
}

interface ZoomStageProps {
  /** Ändert sich der Key (neues Duell), werden alle Zoom-Zustände verworfen. */
  resetKey: string;
  activeId: ImageId;
  otherId: ImageId;
  /** Tap/Klick ohne Verschieben (auch Enter/Space). */
  onTap: () => void;
  onButtonChange: (button: FitFillButton) => void;
  label: string;
  /** Bilder mit `data-image-id`; Größe/Position steuert das CSS über data-mode. */
  children: ReactNode;
}

/** Zoom-Zustand eines Bildes: Skalierung relativ zur Fill-Größe, Verschiebung in px zur Fenstermitte. */
interface View {
  z: number;
  tx: number;
  ty: number;
  /** Noch nicht angefasst: steht im Grundmodus. */
  auto: boolean;
  /** Für dieses Bild wurde Fill gewählt (Button oder Start im Fill-Modus); Gesten ändern das nicht. */
  fill: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/**
 * Zoom & Pan wie bei Google Maps: Pinch (Touch), Mausrad / Trackpad-Pinch (Strg+Rad) zoomt zum
 * Zeiger, Ziehen verschiebt. Jedes Bild des Duells hat seinen eigenen Zoom-Zustand.
 * Das Transform wird direkt am DOM gesetzt (kein Re-Render pro Bewegung).
 */
export const ZoomStage = forwardRef<ZoomStageHandle, ZoomStageProps>(function ZoomStage(
  { resetKey, activeId, otherId, onTap, onButtonChange, label, children },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const views = useRef(new Map<ImageId, View>());
  const lastButton = useRef('');
  // Gewählter Grundmodus für Fotos, die noch nicht angefasst wurden; gilt über alle Duelle (der Zoom selbst nicht).
  const baseMode = useRef<'fit' | 'fill'>('fit');
  // Grundmodus zu Beginn des Duells: unberührte Bilder richten sich danach, auch wenn das andere Bild des Duells gezoomt wird.
  const duelMode = useRef<'fit' | 'fill'>('fit');
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: false, multi: false, startX: 0, startY: 0 });
  // Aktuelle Props für die Callbacks unten, die bewusst nur einmal angelegt werden.
  const latest = useRef({ activeId, otherId, onButtonChange });
  latest.current = { activeId, otherId, onButtonChange };

  /** Angezeigte Größe eines Bildes in der Fill-Ansicht (Zoom 1). */
  const imageSize = useCallback((id: ImageId) => {
    const el = layerRef.current?.querySelector<HTMLElement>(`[data-image-id="${id}"]`);
    return { w: el?.offsetWidth ?? 0, h: el?.offsetHeight ?? 0 };
  }, []);

  /** Kleinster Zoom: Fit-Größe relativ zur Fill-Größe (1, wenn Fit und Fill übereinstimmen oder noch nichts geladen ist). */
  const minZoom = useCallback(
    (id: ImageId) => {
      const root = rootRef.current;
      const { w, h } = imageSize(id);
      if (!root || !w || !h) return 1;
      return Math.min(1, root.clientWidth / w, root.clientHeight / h);
    },
    [imageSize],
  );

  /** Ein Bild startet im gewählten Grundmodus (zuerst Fit, "auto"), bis der Nutzer zoomt, verschiebt oder einen Button nutzt; bis dahin folgt es der Fenstergröße und dem Laden des Bildes. */
  const getView = useCallback(
    (id: ImageId): View => {
      let v = views.current.get(id);
      if (!v) {
        v = { z: 1, tx: 0, ty: 0, auto: true, fill: false };
        views.current.set(id, v);
      }
      if (v.auto) {
        v.fill = duelMode.current === 'fill';
        v.z = v.fill ? 1 : minZoom(id);
        v.tx = 0;
        v.ty = 0;
      }
      return v;
    },
    [minZoom],
  );

  /** Das Bild darf das Fenster nie "verlassen"; ist es kleiner als das Fenster, bleibt es zentriert. */
  const clampView = useCallback(
    (id: ImageId, v: View) => {
      const root = rootRef.current;
      if (!root) return;
      const { w, h } = imageSize(id);
      v.z = clamp(v.z, minZoom(id), MAX_ZOOM);
      const limitX = Math.max(0, (v.z * w - root.clientWidth) / 2);
      const limitY = Math.max(0, (v.z * h - root.clientHeight) / 2);
      v.tx = clamp(v.tx, -limitX, limitX);
      v.ty = clamp(v.ty, -limitY, limitY);
    },
    [imageSize, minZoom],
  );

  /**
   * Zustand des Fit/Fill-Buttons für ein Bild. Bei Fit: expand (-> Fill). Dazwischen und bei Fill: expand, solange Fill noch nicht gewählt wurde, sonst collapse (-> Fit).
   * Über Fill: collapse, -> Fill, wenn Fill gewählt wurde (danach nochmal -> Fit), sonst direkt -> Fit.
   */
  const buttonFor = useCallback(
    (id: ImageId): FitFillButton => {
      const v = getView(id);
      const min = minZoom(id);
      const hasFit = min < 0.999;
      const over = v.z > 1.001;
      const atFill = !over && v.z >= 0.999;
      const atFit = hasFit && v.z <= min + 0.001;
      if (atFit) return { action: 'expand', target: 'fill', disabled: false };
      if (over) return { action: 'collapse', target: v.fill || !hasFit ? 'fill' : 'fit', disabled: false };
      if (atFill) return { action: 'collapse', target: 'fit', disabled: !hasFit };
      return v.fill ? { action: 'collapse', target: 'fit', disabled: false } : { action: 'expand', target: 'fill', disabled: false };
    },
    [getView, minZoom],
  );

  const apply = useCallback(() => {
    const root = rootRef.current;
    const layer = layerRef.current;
    if (!root || !layer) return;
    const id = latest.current.activeId;
    const v = getView(id);
    clampView(id, v);
    layer.style.transform = `translate(${v.tx}px, ${v.ty}px) scale(${v.z})`;
    const min = minZoom(id);
    const button = buttonFor(id);
    root.dataset.zoomed = String(v.z > 1.001);
    // Nach einer Nutzeraktion merkt sich der Grundmodus Fit oder Fill (hineingezoomt zählt als Fill, "dazwischen" ändert nichts).
    // Gibt es kein eigenes Fit (Fit = Fill) und ist nicht hineingezoomt, wurde nichts gewählt.
    if (!v.auto && (min < 0.999 || v.z > 1.001)) {
      if (v.z <= min + 0.001 && min < 0.999) baseMode.current = 'fit';
      else if (v.z >= 0.999) baseMode.current = 'fill';
    }
    const key = `${button.action}${button.target}${button.disabled}`;
    if (key !== lastButton.current) {
      lastButton.current = key;
      latest.current.onButtonChange(button);
    }
  }, [buttonFor, clampView, getView, minZoom]);

  /** Zoom um einen Punkt (relativ zur Fenstermitte), der dabei unter dem Finger/Zeiger bleibt. */
  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number) => {
      const v = getView(latest.current.activeId);
      v.auto = false;
      const next = clamp(v.z * factor, minZoom(latest.current.activeId), MAX_ZOOM);
      const k = next / v.z;
      v.tx = cx - (cx - v.tx) * k;
      v.ty = cy - (cy - v.ty) * k;
      v.z = next;
      apply();
    },
    [apply, getView, minZoom],
  );

  const toCenter = useCallback((clientX: number, clientY: number) => {
    const r = rootRef.current!.getBoundingClientRect();
    return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      pressFitFill() {
        const { activeId: id, otherId } = latest.current;
        const { target, disabled } = buttonFor(id);
        if (disabled) return;
        const v = getView(id);
        const switchesMode = v.fill !== (target === 'fill'); // nur ein Wechsel zwischen gewähltem Fit und Fill gilt für beide Bilder
        const place = (viewId: ImageId, view: View) => {
          view.auto = false;
          view.z = target === 'fill' ? 1 : minZoom(viewId);
          view.fill = target === 'fill';
          view.tx = 0;
          view.ty = 0;
        };
        place(id, v);
        // Wechselt man zwischen Fit und Fill, gilt das auch für das andere Bild des Duells.
        if (switchesMode) place(otherId, getView(otherId));
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
        target.auto = false;
        target.fill = source.fill;
        target.z = source.z;
        target.tx = -(u - 0.5) * source.z * t.w;
        target.ty = -(w - 0.5) * source.z * t.h;
        apply();
      },
    }),
    [apply, buttonFor, getView, imageSize, minZoom],
  );

  // Layout-Effekte laufen vor dem Paint: kein Frame, in dem ein Bild mit dem Zoom des anderen steht.
  // Anderes Bild wird angezeigt => dessen eigenen Zoom-Zustand anwenden.
  useLayoutEffect(apply, [activeId, apply]);

  // Neues Duell => alle Zoom-Zustände verwerfen (jedes Duell startet bei Fill).
  useLayoutEffect(() => {
    views.current.clear();
    duelMode.current = baseMode.current;
    apply();
  }, [resetKey, apply]);

  useEffect(() => {
    const root = rootRef.current!;
    const observer = new ResizeObserver(apply);
    observer.observe(root);
    // Ändert sich die Größe eines Bildes (Seitenverhältnis wird erst nach dem Laden gesetzt), muss der Fit-Zoom neu berechnet werden.
    const layer = layerRef.current!;
    const watched = new Set<Element>();
    const watchImages = () =>
      layer.querySelectorAll('[data-image-id]').forEach((img) => {
        if (!watched.has(img)) {
          watched.add(img);
          observer.observe(img);
        }
      });
    watchImages();
    const mutations = new MutationObserver(watchImages);
    mutations.observe(layer, { childList: true, subtree: true });
    // Wheel muss non-passive registriert werden, damit preventDefault die Seite nicht mitzoomt/scrollt.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = toCenter(e.clientX, e.clientY);
      zoomAt(x, y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)));
    };
    root.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      mutations.disconnect();
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
        v.auto = false;
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
      v.auto = false;
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
