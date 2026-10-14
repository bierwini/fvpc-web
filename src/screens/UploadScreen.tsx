import { useRef, useState, type DragEvent } from 'react';
import { LegalCaption } from '../components/LegalCaption';
import type { ImageId, TournamentImage } from '../tournament/types';

interface UploadScreenProps {
  images: TournamentImage[];
  shuffleEnabled: boolean;
  onShuffleChange: (enabled: boolean) => void;
  onAddFiles: (files: Iterable<File>) => void;
  onRemoveImage: (id: ImageId) => void;
  onStart: () => void;
}

export function UploadScreen({
  images,
  shuffleEnabled,
  onShuffleChange,
  onAddFiles,
  onRemoveImage,
  onStart,
}: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onAddFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <main className="screen screen--upload">
      <header>
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
        <p>Drag &amp; drop images here</p>
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
        <button type="button" onClick={() => inputRef.current?.click()}>
          Dateien auswählen
        </button>
      </section>

      {images.length > 0 && (
        <section aria-label="Loaded images">
          <h2>{images.length} images loaded</h2>
          <ul className="thumbs">
            {images.map((img) => (
              <li key={img.id}>
                <img src={img.url} alt="" />
                <span>{img.name}</span>
                <button type="button" onClick={() => onRemoveImage(img.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={shuffleEnabled}
        onClick={() => onShuffleChange(!shuffleEnabled)}
      >
        Shuffle: {shuffleEnabled ? 'On' : 'Off'}
      </button>

      <footer>
        <LegalCaption />
        <button type="button" className="primary" disabled={images.length < 2} onClick={onStart}>
          Start Tournament
        </button>
      </footer>
    </main>
  );
}
