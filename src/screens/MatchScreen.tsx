import { useRef, useState } from 'react';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { ZoomStage, type ZoomStageHandle, type ZoomState } from '../components/ZoomStage';
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
}: MatchScreenProps) {
  // Die Auswahl gehört zu einem bestimmten Duell; bei einem neuen Duell gilt wieder Bild A.
  const matchKey = match.join('|');
  const [selection, setSelection] = useState<{ matchKey: string; index: 0 | 1 }>({
    matchKey,
    index: 0,
  });
  const activeIndex = selection.matchKey === matchKey ? selection.index : 0;
  const activeId = match[activeIndex];

  // Jedes Foto startet im zuletzt gewählten Modus (zuerst Fit, Bild komplett sichtbar); der Zoom selbst gilt nur für ein Duell.
  const [zoomState, setZoomState] = useState<ZoomState>('fill');
  const stageRef = useRef<ZoomStageHandle>(null);
  const otherId = match[activeIndex === 0 ? 1 : 0];

  // Fit/Fill-Button. Das Zeichen zeigt die Aktion: ↗↙ (Pfeile nach innen) oder ↙↗ (nach außen, "Fill").
  //   gezoomt (über Fill): ↗↙, setzt den Zoom zurück auf Fill.
  //   Fit erreicht (herausgezoomt oder per Button): ↙↗, setzt auf Fill.
  //   sonst (Fill oder dazwischen): ↗↙, zoomt auf Fit.
  const fitFill =
    zoomState === 'zoomed'
      ? { icon: '↗↙', aria: 'Reset zoom', onClick: () => stageRef.current?.resetZoom() }
      : zoomState === 'fit'
        ? { icon: '↙↗', aria: 'Scale to fill window', onClick: () => stageRef.current?.resetZoom() }
        : { icon: '↗↙', aria: 'Scale to fit window', onClick: () => stageRef.current?.zoomToFit() };

  const [closeOpen, setCloseOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Nur diese (max. 4) Bilder sind im DOM: beide des aktuellen Duells (für den Instant-Toggle)
  // plus die des Folgeduells. Key = Bild-ID, damit beim Weiterschalten nichts neu geladen wird.
  const mountedIds = [...new Set([...match, ...preloadIds])];

  return (
    <div className="screen screen--match">
      <ZoomStage
        ref={stageRef}
        resetKey={matchKey}
        activeId={activeId}
        otherId={otherId}
        onZoomStateChange={setZoomState}
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
          <button type="button" aria-label={fitFill.aria} onClick={fitFill.onClick}>
            <span aria-hidden="true">{fitFill.icon}</span>
          </button>
          <button
            type="button"
            aria-label="Sync zoom and position with the other photo"
            onClick={() => stageRef.current?.syncFromOther()}
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
        <button type="button" onClick={() => setCloseOpen(true)}>
          Close
        </button>
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
        <p>Click the photo to switch between the two candidates. Pinch or scroll to zoom, drag to move. Choose the one you prefer.</p>
      </Sheet>
    </div>
  );
}
