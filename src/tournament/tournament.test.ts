import { describe, expect, it, vi } from 'vitest';
import { BlobRegistry } from './blobRegistry';
import { advanceToNextRound, buildRound, createInitialState, tournamentReducer } from './engine';
import { computeRanking } from './ranking';
import { getStartOrder } from './shuffle';
import type { TournamentAction, TournamentState } from './types';

function run(state: TournamentState, ...actions: TournamentAction[]): TournamentState {
  return actions.reduce(tournamentReducer, state);
}

function started(n: number): TournamentState {
  const ids = Array.from({ length: n }, (_, i) => `i${i + 1}`);
  return run(
    createInitialState(),
    { type: 'GO_TO_UPLOAD' },
    {
      type: 'IMAGES_ADDED',
      images: ids.map((id) => ({ id, name: id, url: `blob:${id}` })),
    },
    { type: 'START_TOURNAMENT', order: ids },
  );
}

describe('buildRound / Freilos', () => {
  it('parkt bei ungerader Anzahl das letzte Bild', () => {
    expect(buildRound(['a', 'b', 'c'])).toEqual({ matchQueue: [['a', 'b']], autoAdvance: 'c' });
    expect(buildRound(['a', 'b']).autoAdvance).toBeNull();
  });

  it('setzt das geparkte Bild in der nächsten Runde ganz nach vorne', () => {
    let s = started(5); // Runde 1: (1,2) (3,4), 5 geparkt
    expect(s.autoAdvance).toBe('i5');
    s = run(s, { type: 'PICK_WINNER', winnerId: 'i1' }, { type: 'PICK_WINNER', winnerId: 'i3' });
    expect(s.round).toBe(2);
    expect(s.currentRoundCompetitors).toEqual(['i5', 'i1', 'i3']);
    expect(s.matchQueue).toEqual([['i5', 'i1']]);
    expect(s.autoAdvance).toBe('i3');
  });

  it('advanceToNextRound ist auch direkt aufrufbar', () => {
    const s = { ...started(3), matchQueue: [], winnersThisRound: ['i1'] };
    expect(advanceToNextRound(s).currentRoundCompetitors).toEqual(['i3', 'i1']);
  });
});

describe('Ausschluss', () => {
  it('lässt den anderen gewinnen und senkt totalMatches um genau 1', () => {
    const s0 = started(4);
    expect(s0.totalMatches).toBe(3);
    const s1 = run(s0, { type: 'EXCLUDE_IMAGE', imageId: 'i1' });
    expect(s1.winnersThisRound).toEqual(['i2']);
    expect(s1.totalMatches).toBe(2);
    expect(s1.completedMatches).toBe(0);
  });

  it('Fortschritt endet bei completed === total', () => {
    const s = run(
      started(4),
      { type: 'EXCLUDE_IMAGE', imageId: 'i1' },
      { type: 'PICK_WINNER', winnerId: 'i3' },
      { type: 'PICK_WINNER', winnerId: 'i2' },
    );
    expect(s.view).toBe('ranking');
    expect(s.completedMatches).toBe(s.totalMatches);
  });

  it('ignoriert Ids, die nicht im aktuellen Duell sind', () => {
    const s = started(4);
    expect(tournamentReducer(s, { type: 'EXCLUDE_IMAGE', imageId: 'i3' })).toBe(s);
    expect(tournamentReducer(s, { type: 'PICK_WINNER', winnerId: 'i3' })).toBe(s);
  });
});

describe('Endranking (dicht)', () => {
  it('8 Bilder: #1, #2, #3 ×2, #4 ×4', () => {
    let s = started(8);
    while (s.view === 'match') {
      s = run(s, { type: 'PICK_WINNER', winnerId: s.matchQueue[0]![0] });
    }
    const ranks = computeRanking(s.championId, s.eliminations).map((r) => r.rank);
    expect(ranks).toEqual([1, 2, 3, 3, 4, 4, 4, 4]);
  });

  it('7 Bilder mit Freilos: keine Lücken', () => {
    let s = started(7);
    while (s.view === 'match') {
      s = run(s, { type: 'PICK_WINNER', winnerId: s.matchQueue[0]![0] });
    }
    const ranks = computeRanking(s.championId, s.eliminations).map((r) => r.rank);
    expect(ranks[0]).toBe(1);
    expect(ranks).toHaveLength(7);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]! - ranks[i - 1]!).toBeLessThanOrEqual(1);
    }
  });

  it('ausgeschlossene Bilder bekommen keinen Rang und erzeugen keine Lücke', () => {
    // 2 Bilder, eines ausgeschlossen -> sofort Sieger, kein #2.
    const s = run(started(2), { type: 'EXCLUDE_IMAGE', imageId: 'i1' });
    expect(s.view).toBe('ranking');
    expect(computeRanking(s.championId, s.eliminations)).toEqual([
      { imageId: 'i2', rank: 1, eliminatedInRound: null },
    ]);
  });
});

describe('BlobRegistry', () => {
  it('revokeAll gibt jede erzeugte URL genau einmal frei', () => {
    let n = 0;
    const create = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${++n}`);
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const reg = new BlobRegistry();
    const a = reg.register(new File([''], 'a.png', { type: 'image/png' }));
    reg.register(new File([''], 'b.png', { type: 'image/png' }));
    reg.revoke(a.id);
    reg.revokeAll();
    reg.revokeAll();
    expect(revoke.mock.calls.map((c) => c[0])).toEqual(['blob:1', 'blob:2']);
    expect(reg.size).toBe(0);
    create.mockRestore();
    revoke.mockRestore();
  });
});

describe('Startreihenfolge & Abbruch', () => {
  it('Shuffle aus: exakt die Upload-Reihenfolge', () => {
    const order = ['a', 'b', 'c', 'd', 'e'];
    expect(getStartOrder(order, false, () => 0)).toEqual(order);
  });

  it('Shuffle an: Permutation derselben Bilder, Original bleibt unverändert', () => {
    const order = ['a', 'b', 'c', 'd', 'e'];
    const out = getStartOrder(order, true, () => 0);
    expect(out).not.toEqual(order);
    expect([...out].sort()).toEqual(order);
    expect(order).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('ABORT_TO_UPLOAD behält Bilder, verwirft den Turnierfortschritt', () => {
    const s0 = run(started(4), { type: 'PICK_WINNER', winnerId: 'i1' });
    const s = run(s0, { type: 'ABORT_TO_UPLOAD' });
    expect(s.view).toBe('upload');
    expect(s.images).toBe(s0.images);
    expect(s.imageOrder).toEqual(['i1', 'i2', 'i3', 'i4']);
    expect(s.eliminations).toEqual([]);
    expect(s.matchQueue).toEqual([]);
    // erneuter Start funktioniert
    expect(run(s, { type: 'START_TOURNAMENT', order: s.imageOrder }).totalMatches).toBe(3);
  });
});
