import { useRef, useState, type DragEvent } from 'react';
import { LegalCaption } from '../components/LegalCaption';
import type { AddFilesResult, ImageId, TournamentImage } from '../tournament/types';

interface UploadScreenProps {
  images: TournamentImage[];
  shuffleEnabled: boolean;
  onShuffleChange: (enabled: boolean) => void;
  onAddFiles: (files: Iterable<File>) => AddFilesResult;
  onRemoveImage: (id: ImageId) => void;
  /** Back: verwirft alle geladenen Bilder, zurück zum Intro. */
  onBack: () => void;
  onStart: () => void;
}

function describeResult({ duplicates, skipped }: AddFilesResult): string {
  const parts: string[] = [];
  if (duplicates > 0) parts.push(`${duplicates} duplicate${duplicates > 1 ? 's' : ''} skipped`);
  if (skipped > 0) parts.push(`${skipped} non-image file${skipped > 1 ? 's' : ''} skipped`);
  return parts.join(' · ');
}

export function UploadScreen({
  images,
  shuffleEnabled,
  onShuffleChange,
  onAddFiles,
  onRemoveImage,
  onBack,
  onStart,
}: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const openPicker = () => inputRef.current?.click();

  const addFiles = (files: File[]) => setNotice(describeResult(onAddFiles(files)));

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="screen screen--upload">
      <div className="topbar">
        <button type="button" onClick={onBack}>
          ← Back
        </button>
      </div>

      <main className="upload__column">
        <header>
          <h1>Add your photos</h1>
          <p className="subtitle">Add at least two images to start the tournament.</p>
        </header>

        <div className="upload__body">
          <section
            className={`dropzone${dragging ? ' dropzone--active' : ''}`}
            aria-label="Drop images here"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                // Array.from VOR dem Zurücksetzen: die FileList ist live.
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = ''; // gleiche Datei darf erneut gewählt werden
              }}
            />

            <div className="dropzone__content">
              {images.length === 0 ? (
                <div className="dropzone__empty">
                  <p>Drag &amp; drop images here</p>
                  <button type="button" onClick={openPicker}>
                    Dateien auswählen
                  </button>
                </div>
              ) : (
                <ul className="thumbs">
                  <li>
                    <button
                      type="button"
                      className="thumbs__add"
                      aria-label="Add more photos"
                      onClick={openPicker}
                    >
                      +
                    </button>
                  </li>
                  {images.map((img) => (
                    <li key={img.id}>
                      {/* async + lazy: große Fotos werden außerhalb des Main-Threads dekodiert */}
                      <img src={img.url} alt={img.name} loading="lazy" decoding="async" />
                      <button
                        type="button"
                        className="thumbs__remove"
                        aria-label={`Remove ${img.name}`}
                        onClick={() => onRemoveImage(img.id)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="dropzone__notice" role="status">
              {notice}
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={shuffleEnabled}
              className="dropzone__shuffle"
              onClick={() => onShuffleChange(!shuffleEnabled)}
            >
              Shuffle: {shuffleEnabled ? 'On' : 'Off'}
            </button>
          </section>
        </div>

        <footer>
          <LegalCaption />
          <button type="button" className="primary" disabled={images.length < 2} onClick={onStart}>
            Start Tournament
          </button>
        </footer>
      </main>
    </div>
  );
}
