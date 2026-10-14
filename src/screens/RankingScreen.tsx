import { useState } from 'react';
import { ConfirmSheet } from '../components/Sheet';
import type { ImageId, RankingEntry, TournamentImage } from '../tournament/types';

interface RankingScreenProps {
  ranking: RankingEntry[];
  images: Record<ImageId, TournamentImage>;
  /** Close: zurück zum Upload (Bilder bleiben). */
  onClose: () => void;
  /** Next Game: alles freigeben, zurück zum leeren Intro. */
  onNextGame: () => void;
}

function downloadImage(image: TournamentImage) {
  const a = document.createElement('a');
  a.href = image.url;
  a.download = image.name;
  a.click();
}

export function RankingScreen({ ranking, images, onClose, onNextGame }: RankingScreenProps) {
  const [hideNames, setHideNames] = useState(false);
  const [sheet, setSheet] = useState<'close' | 'next' | null>(null);

  const top = ranking[0] ? images[ranking[0].imageId] : undefined;

  return (
    <div className="screen screen--ranking">
      <header className="bar bar--top">
        <h1>Ranking</h1>
        <button type="button" onClick={() => setSheet('close')}>
          Close
        </button>
      </header>

      <main>
        <ol className="rank-grid">
          {ranking.map(({ imageId, rank }) => {
            const image = images[imageId]!;
            return (
              <li key={imageId}>
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
        <button type="button" className="primary" onClick={() => setSheet('next')}>
          Next Game
        </button>
      </footer>

      <ConfirmSheet
        open={sheet === 'close'}
        title="Close ranking?"
        message="You return to the upload. Your loaded photos are kept."
        confirmLabel="Close"
        onConfirm={() => {
          setSheet(null);
          onClose();
        }}
        onCancel={() => setSheet(null)}
      />
      <ConfirmSheet
        open={sheet === 'next'}
        title="Start next game?"
        message="This clears all photos and returns to the start. The ranking is lost."
        confirmLabel="Next Game"
        onConfirm={() => {
          setSheet(null);
          onNextGame();
        }}
        onCancel={() => setSheet(null)}
      />
    </div>
  );
}
