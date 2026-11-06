import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { ZoomStage, type ZoomStageHandle, type FitFillButton } from '../components/ZoomStage';
import type { ImageId, Matchup, TournamentImage } from '../tournament/types';

interface MatchScreenProps {
  match: Matchup;
  /** Bilder des Folgeduells: werden schon jetzt im Hintergrund geladen und dekodiert. */
  preloadIds: ImageId[];
  images: Record<ImageId, TournamentImage>;
  completedMatches: number;
  totalMatches: number;
  onChoose: (id: ImageId) => void;
  onRemove: (id: ImageId) => void;
  /** Close: alles verwerfen, zurück zum Intro. */
  onClose: () => void;
  /** Einstufiges Undo der letzten Entscheidung. */
  canUndo: boolean;
  onUndo: () => void;
  /** Nach Undo: dieses Bild (gewählt bzw. entfernt) wird angezeigt. */
  focus: { id: ImageId; token: number } | null;
}

/** Seitenverhältnis fürs CSS (Fill-Größe wird dort aus --ar berechnet). */
function setAspect(el: HTMLImageElement) {
  if (el.naturalWidth > 0) el.style.setProperty('--ar', String(el.naturalWidth / el.naturalHeight));
}

/** Stabile Ref-Funktion: dekodiert das Bild einmal beim Einhängen, nicht erst beim Anzeigen. */
function prepareImage(el: HTMLImageElement | null) {
  if (!el) return;
  setAspect(el);
  el.decode().then(() => setAspect(el), () => {});
}

export function MatchScreen({
  match,
  preloadIds,
  images,
  completedMatches,
  totalMatches,
  onChoose,
  onRemove,
  onClose,
  canUndo,
  onUndo,
  focus,
}: MatchScreenProps) {
  // Die Auswahl gehört zu einem bestimmten Duell; bei einem neuen Duell gilt wieder Bild A.
  const matchKey = match.join('|');
  const [selection, setSelection] = useState<{ matchKey: string; index: 0 | 1 }>({
    matchKey,
    index: 0,
  });
  const activeIndex = selection.matchKey === matchKey ? selection.index : 0;
  // Nach Undo das Bild zeigen, bei dem entschieden wurde (vor dem Paint, damit nichts aufblitzt).
  useLayoutEffect(() => {
    if (focus && match.includes(focus.id)) setSelection({ matchKey, index: match[0] === focus.id ? 0 : 1 });
  }, [focus?.token]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeId = match[activeIndex];

  // Jedes Foto startet im zuletzt gewählten Modus (zuerst Fit, Bild komplett sichtbar); der Zoom selbst gilt nur für ein Duell.
  const [fitFillState, setFitFillState] = useState<FitFillButton>({ action: 'expand', target: 'fill', disabled: false });
  const [synced, setSynced] = useState(false);
  const stageRef = useRef<ZoomStageHandle>(null);
  const otherId = match[activeIndex === 0 ? 1 : 0];

  // Fit/Fill-Button. Das Zeichen zeigt die Aktion: ↙↗ (Pfeile nach außen, "expand") oder ↗↙ (nach innen, "collapse").
  //   Die Regeln (wann welche Aktion, wohin es springt) stehen in ZoomStage (buttonFor).
  const fitFill = {
    icon: fitFillState.action === 'expand' ? '↙↗' : '↗↙',
    aria:
      fitFillState.target === 'fill'
        ? fitFillState.action === 'expand'
          ? 'Scale to fill window'
          : 'Reset zoom'
        : 'Scale to fit window',
    disabled: fitFillState.disabled,
    onClick: () => stageRef.current?.pressFitFill(),
  };

  const [closeOpen, setCloseOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Nur diese (max. 4) Bilder sind im DOM: beide des aktuellen Duells (für den Instant-Toggle)
  // plus die des Folgeduells. Key = Bild-ID, damit beim Weiterschalten nichts neu geladen wird.
  // Tastenkürzel: Enter = Choose, Pfeil links/rechts und Leertaste = zum anderen Foto, Strg/Cmd+Z = Undo.
  // Enter bleibt bei fokussierten Buttons und Eingaben deren eigene Aktion.
  const keys = useRef({ activeIndex, activeId, matchKey, canUndo, onUndo, onChoose, blocked: false });
  keys.current = { activeIndex, activeId, matchKey, canUndo, onUndo, onChoose, blocked: closeOpen || helpOpen };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current;
      if (k.blocked || e.defaultPrevented) return;
      const target = e.target as HTMLElement;
      const typing = !!target.closest('input, select, textarea');
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (typing) return;
        e.preventDefault();
        if (k.canUndo) k.onUndo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat || typing) return;
      const onControl = !!target.closest('button, a, [role="dialog"]') && !target.closest('.stage');
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || (e.key === ' ' && !onControl)) {
        e.preventDefault();
        setSelection({ matchKey: k.matchKey, index: k.activeIndex === 0 ? 1 : 0 });
      } else if (e.key === 'Enter' && !onControl) {
        e.preventDefault();
        k.onChoose(k.activeId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const mountedIds = [...new Set([...match, ...preloadIds])];

  return (
    <div
      className="screen screen--match"
      // Nach einem Mausklick den Fokus vom Button nehmen, sonst löst Leertaste/Enter ihn erneut aus statt Foto wechseln/wählen.
      onClick={(e) => e.detail > 0 && (e.target as HTMLElement).closest<HTMLElement>('button')?.blur()}
    >
      <ZoomStage
        ref={stageRef}
        resetKey={matchKey}
        activeId={activeId}
        otherId={otherId}
        onButtonChange={setFitFillState}
        label={`Showing photo ${activeIndex === 0 ? 'A' : 'B'} – click to switch, pinch or scroll to zoom`}
        onTap={() => setSelection({ matchKey, index: activeIndex === 0 ? 1 : 0 })}
      >
        {mountedIds.map((id) => (
          <img
            key={id}
            ref={prepareImage}
            data-image-id={id}
            onLoad={(e) => setAspect(e.currentTarget)}
            src={images[id]!.url}
            alt={id === activeId ? images[id]!.name : ''}
            className={id === activeId ? 'stage__img stage__img--active' : 'stage__img'}
            draggable={false}
          />
        ))}
      </ZoomStage>

      <header className="bar bar--top">
        <div className="toolbar-group" role="group" aria-label="Tools">
          <button type="button" aria-label={fitFill.aria} disabled={fitFill.disabled} onClick={fitFill.onClick}>
            <span aria-hidden="true">{fitFill.icon}</span>
          </button>
          <button
            type="button"
            className={synced ? 'is-on' : undefined}
            aria-pressed={synced}
            aria-label="Keep zoom and position of both photos in sync"
            onClick={() => {
              stageRef.current?.setSync(!synced);
              setSynced(!synced);
            }}
          >
            Sync
          </button>
        </div>
        <progress
          value={completedMatches}
          max={Math.max(totalMatches, 1)}
          aria-label="Tournament progress"
        >
          {completedMatches} / {totalMatches}
        </progress>
        <div className="toolbar-group">
          <button type="button" disabled={!canUndo} aria-label="Undo last decision (Ctrl/Cmd+Z)" onClick={onUndo}>
            Undo
          </button>
          <button type="button" onClick={() => setCloseOpen(true)}>
            Close
          </button>
        </div>
      </header>

      <footer className="bar bar--bottom">
        <button type="button" onClick={() => onRemove(activeId)}>
          Remove Current Photo
        </button>
        <button type="button" className="primary" onClick={() => onChoose(activeId)}>
          Choose Photo
        </button>
        <button type="button" aria-label="Help" onClick={() => setHelpOpen(true)}>
          ?
        </button>
      </footer>

      <ConfirmSheet
        open={closeOpen}
        title="Cancel tournament?"
        message="The tournament and all loaded photos are discarded and you return to the start."
        confirmLabel="Discard & Close"
        onConfirm={() => {
          setCloseOpen(false);
          onClose();
        }}
        onCancel={() => setCloseOpen(false)}
      />
      <Sheet
        open={helpOpen}
        title="Help"
        onClose={() => setHelpOpen(false)}
        actions={
          <button type="button" onClick={() => setHelpOpen(false)}>
            OK
          </button>
        }
      >
        <p>Click the photo or press the left/right arrow key to switch between the two candidates. Pinch or scroll to zoom, drag to move. Choose the one you prefer (Enter). Undo (Ctrl/Cmd+Z) takes back the last decision.</p>
      </Sheet>
    </div>
  );
}
