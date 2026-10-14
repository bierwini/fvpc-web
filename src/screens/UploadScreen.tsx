import { useRef, useState, type DragEvent } from 'react';
import { LegalCaption } from '../components/LegalCaption';
import type { ImageId, TournamentImage } from '../tournament/types';

interface UploadScreenProps {
  images: TournamentImage[];
  shuffleEnabled: boolean;
  onShuffleChange: (enabled: boolean) => void;
  onAddFiles: (files: Iterable<File>) => void;
  onRemoveImage: (id: ImageId) => void;
  onBack: () => void;
  onStart: () => void;
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
  const openPicker = () => inputRef.current?.click();

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onAddFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <main className="screen screen--upload">
      <header>
        <button type="button" className="back" onClick={onBack}>
          ← Back
        </button>
        <h1>Add your photos</h1>
        <p className="subtitle">Add at least two images to start the tournament.</p>
      </header>

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
            onAddFiles(Array.from(e.target.files ?? []));
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
                <li key={img.id} className="thumbs__item">
                  <img src={img.url} alt={img.name} />
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

      <footer>
        <LegalCaption />
        <button type="button" className="primary" disabled={images.length < 2} onClick={onStart}>
          Start Tournament
        </button>
      </footer>
    </main>
  );
}
