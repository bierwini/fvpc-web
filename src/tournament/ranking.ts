import type { Elimination, ImageId, RankingEntry } from './types';

/**
 * Dichtes Ranking nach Ausscheide-Runde: Sieger = #1, danach je eine Rang-Stufe
 * pro Runde, spätere Runde zuerst (Finalverlierer #2, Halbfinalverlierer #3, …).
 * Ausgeschlossene Bilder ('excluded') erhalten keinen Rang und erzeugen keine Lücke.
 */
export function computeRanking(
  championId: ImageId | null,
  eliminations: readonly Elimination[],
): RankingEntry[] {
  const ranking: RankingEntry[] = [];
  if (championId !== null) {
    ranking.push({ imageId: championId, rank: 1, eliminatedInRound: null });
  }

  const byRound = new Map<number, ImageId[]>();
  for (const e of eliminations) {
    if (e.reason !== 'lost') continue;
    const group = byRound.get(e.round) ?? [];
    group.push(e.imageId);
    byRound.set(e.round, group);
  }

  const roundsDescending = [...byRound.keys()].sort((a, b) => b - a);
  roundsDescending.forEach((round, index) => {
    for (const imageId of byRound.get(round) ?? []) {
      ranking.push({ imageId, rank: index + 2, eliminatedInRound: round });
    }
  });

  return ranking;
}

/** Bilder, die manuell ausgeschlossen wurden (nicht im Ranking). */
export function getExcludedIds(eliminations: readonly Elimination[]): ImageId[] {
  return eliminations.filter((e) => e.reason === 'excluded').map((e) => e.imageId);
}
