import type { ImageId, TournamentImage } from './types';

/**
 * Einziger Ort, der URL.createObjectURL / revokeObjectURL aufruft.
 * Jede erzeugte URL ist hier registriert, bis sie explizit freigegeben wird –
 * so kann kein Blob am Reset vorbeileaken.
 */
export class BlobRegistry {
  private urls = new Map<ImageId, string>();
  private counter = 0;

  register(file: File): TournamentImage {
    const id = `img-${++this.counter}`;
    const url = URL.createObjectURL(file);
    this.urls.set(id, url);
    return { id, name: file.name, url };
  }

  revoke(id: ImageId): void {
    const url = this.urls.get(id);
    if (url === undefined) return;
    URL.revokeObjectURL(url);
    this.urls.delete(id);
  }

  revokeAll(): void {
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
  }

  get size(): number {
    return this.urls.size;
  }
}
