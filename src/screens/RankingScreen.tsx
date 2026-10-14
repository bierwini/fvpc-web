import { useState } from 'react';
import { ConfirmSheet } from '../components/Sheet';
import type { ImageId, RankingEntry, TournamentImage } from '../tournament/types';

interface RankingScreenProps {
  ranking: RankingEntry[];
  images: Record<ImageId, TournamentImage>;
  /** Close (mit Bestätigung): alles verwerfen, zurück zum Intro. */
  onClose: () => void;
  /** Next Game (ohne Bestätigung): alles verwerfen, zurück zum leeren Upload. */
  onNextGame: () => void;
}

/** Größenstufe: #1 groß, #2 mittel, alle weiteren klein. */
function tierOf(rank: number) {
  return rank === 1 ? 'first' : rank === 2 ? 'second' : 'rest';
}

function downloadImage(image: TournamentImage) {
  const a = document.createElement('a');
  a.href = image.url;
  a.download = image.name;
  a.click();
}

export function RankingScreen({ ranking, images, onClose, onNextGame }: RankingScreenProps) {
  const [hideNames, setHideNames] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const top = ranking[0] ? images[ranking[0].imageId] : undefined;

  return (
    <div className="screen screen--ranking">
      <header className="bar bar--top">
        <h1>Ranking</h1>
        <button type="button" onClick={() => setCloseOpen(true)}>
          Close
        </button>
      </header>

      <main>
        <ol className="rank-grid">
          {ranking.map(({ imageId, rank }) => {
            const image = images[imageId]!;
            return (
              <li key={imageId} className={`rank-grid__item rank-grid__item--${tierOf(rank)}`}>
                <figure>
                  <img src={image.url} alt={image.name} />
                  <figcaption>
                    <span className="rank-grid__rank">#{rank}</span>
                    {!hideNames && <span className="rank-grid__name">{image.name}</span>}
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ol>
      </main>

      <footer className="bar bar--bottom">
        <button type="button" aria-pressed={hideNames} onClick={() => setHideNames(!hideNames)}>
          Hide File Names
        </button>
        <button type="button" disabled={!top} onClick={() => top && downloadImage(top)}>
          Download Top 1
        </button>
        <button type="button" className="primary" onClick={onNextGame}>
          Next Game
        </button>
      </footer>

      <ConfirmSheet
        open={closeOpen}
        title="Close ranking?"
        message="The ranking and all loaded photos are discarded and you return to the start."
        confirmLabel="Discard & Close"
        onConfirm={() => {
          setCloseOpen(false);
          onClose();
        }}
        onCancel={() => setCloseOpen(false)}
      />
    </div>
  );
}
