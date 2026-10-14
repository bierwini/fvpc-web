import type { ImageId, TournamentImage } from './types';

/** Datei-Fingerabdruck: Browser liefern keinen Pfad, Name + Größe + Änderungsdatum ist der übliche Standard. */
export function fileFingerprint(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * Einziger Ort, der URL.createObjectURL / revokeObjectURL aufruft.
 * Jede erzeugte URL ist hier registriert, bis sie explizit freigegeben wird –
 * so kann kein Blob am Reset vorbeileaken.
 */
export class BlobRegistry {
  private entries = new Map<ImageId, { url: string; fingerprint: string }>();
  private fingerprints = new Set<string>();
  private counter = 0;

  /** Gibt null zurück, wenn dieselbe Datei schon geladen ist (es wird dann kein Blob erzeugt). */
  register(file: File): TournamentImage | null {
    const fingerprint = fileFingerprint(file);
    if (this.fingerprints.has(fingerprint)) return null;
    const id = `img-${++this.counter}`;
    const url = URL.createObjectURL(file);
    this.entries.set(id, { url, fingerprint });
    this.fingerprints.add(fingerprint);
    return { id, name: file.name, url };
  }

  revoke(id: ImageId): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    URL.revokeObjectURL(entry.url);
    this.fingerprints.delete(entry.fingerprint);
    this.entries.delete(id);
  }

  revokeAll(): void {
    for (const { url } of this.entries.values()) URL.revokeObjectURL(url);
    this.entries.clear();
    this.fingerprints.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
