import type { ImageId } from './types';

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Startreihenfolge für Runde 1: einmalig gemischt oder strikt die Upload-Reihenfolge. */
export function getStartOrder(
  uploadOrder: readonly ImageId[],
  shuffleEnabled: boolean,
  rng?: () => number,
): ImageId[] {
  return shuffleEnabled ? shuffle(uploadOrder, rng) : [...uploadOrder];
}
