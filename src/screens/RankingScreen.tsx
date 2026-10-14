import { useState } from 'react';
import { PopupMenu } from '../components/PopupMenu';
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

type NameMode = 'all' | 'top' | 'none';

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

/** Mehrere Downloads leicht gestaffelt, sonst blockieren manche Browser alle bis auf den ersten. */
function downloadImages(items: TournamentImage[]) {
  items.forEach((image, i) => setTimeout(() => downloadImage(image), i * 250));
}

export function RankingScreen({ ranking, images, onClose, onNextGame }: RankingScreenProps) {
  const [nameMode, setNameMode] = useState<NameMode>('top');
  const [closeOpen, setCloseOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<ImageId>>(new Set());

  const imagesForRanks = (maxRank: number) =>
    ranking.filter((r) => r.rank <= maxRank).map((r) => images[r.imageId]!);

  const toggleSelected = (id: ImageId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const showName = (rank: number) => nameMode === 'all' || (nameMode === 'top' && rank <= 2);

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
            const isSelected = selected.has(imageId);
            return (
              <li key={imageId} className={`rank-grid__item rank-grid__item--${tierOf(rank)}`}>
                <figure>
                  <img src={image.url} alt={image.name} />
                  <figcaption>
                    <span className="rank-grid__rank">#{rank}</span>
                    {showName(rank) && <span className="rank-grid__name">{image.name}</span>}
                  </figcaption>
                </figure>
                {selecting && (
                  <button
                    type="button"
                    className={`rank-grid__select${isSelected ? ' rank-grid__select--on' : ''}`}
                    aria-pressed={isSelected}
                    aria-label={`Select #${rank} ${image.name}`}
                    onClick={() => toggleSelected(imageId)}
                  >
                    {isSelected ? '✓' : ''}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </main>

      <footer className="bar bar--bottom">
        <PopupMenu
          label="File Names"
          items={[
            { key: 'all', label: 'Show all', checked: nameMode === 'all', onSelect: () => setNameMode('all') },
            { key: 'top', label: 'Show for Top Ranks', checked: nameMode === 'top', onSelect: () => setNameMode('top') },
            { key: 'none', label: 'Hide all', checked: nameMode === 'none', onSelect: () => setNameMode('none') },
          ]}
        />

        {selecting ? (
          <div className="toolbar-group" role="group" aria-label="Download selection">
            <button type="button" onClick={stopSelecting}>
              Cancel
            </button>
            <button
              type="button"
              className="primary"
              disabled={selected.size === 0}
              onClick={() => {
                downloadImages(ranking.filter((r) => selected.has(r.imageId)).map((r) => images[r.imageId]!));
                stopSelecting();
              }}
            >
              Download ({selected.size})
            </button>
          </div>
        ) : (
          <PopupMenu
            label="Download"
            align="center"
            disabled={ranking.length === 0}
            items={[
              { key: 'top1', label: 'Top 1', onSelect: () => downloadImages(imagesForRanks(1)) },
              { key: 'top2', label: 'Top 1 + Top 2', onSelect: () => downloadImages(imagesForRanks(2)) },
              { key: 'own', label: 'Own Selection', onSelect: () => setSelecting(true) },
            ]}
          />
        )}

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
