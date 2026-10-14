import { useState } from 'react';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import type { ImageId, Matchup, TournamentImage } from '../tournament/types';

interface MatchScreenProps {
  match: Matchup;
  images: Record<ImageId, TournamentImage>;
  completedMatches: number;
  totalMatches: number;
  onChoose: (id: ImageId) => void;
  onRemove: (id: ImageId) => void;
  onAbort: () => void;
}

export function MatchScreen({
  match,
  images,
  completedMatches,
  totalMatches,
  onChoose,
  onRemove,
  onAbort,
}: MatchScreenProps) {
  // 0 = Bild A, 1 = Bild B. Der Parent setzt per `key` bei jedem neuen Duell zurück.
  const [activeIndex, setActiveIndex] = useState<0 | 1>(0);
  const [closeOpen, setCloseOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const activeId = match[activeIndex];

  return (
    <div className="screen screen--match">
      <header className="bar bar--top">
        <div className="toolbar-group" role="group" aria-label="Tools">
          <button type="button" aria-label="Placeholder tool 1">
            ◐
          </button>
          <button type="button" aria-label="Placeholder tool 2">
            ◑
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

      <main className="stage">
        {/* Beide Bilder bleiben im DOM (bereits dekodiert) -> Toggle ohne Ladezeit. */}
        <button
          type="button"
          className="stage__toggle"
          aria-label={`Showing photo ${activeIndex === 0 ? 'A' : 'B'} – click to switch`}
          onClick={() => setActiveIndex(activeIndex === 0 ? 1 : 0)}
        >
          {match.map((id, i) => (
            <img
              key={id}
              src={images[id]!.url}
              alt={images[id]!.name}
              hidden={i !== activeIndex}
              draggable={false}
            />
          ))}
        </button>
      </main>

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
        message="Your progress is discarded. Your loaded photos are kept and you return to the upload."
        confirmLabel="Cancel Tournament"
        onConfirm={() => {
          setCloseOpen(false);
          onAbort();
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
        <p>Click the photo to switch between the two candidates. Choose the one you prefer.</p>
      </Sheet>
    </div>
  );
}
