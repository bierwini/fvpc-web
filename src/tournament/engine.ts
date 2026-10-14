import type {
  ImageId,
  Matchup,
  TournamentAction,
  TournamentState,
} from './types';

export function createInitialState(): TournamentState {
  return {
    view: 'intro',
    images: {},
    imageOrder: [],
    round: 0,
    currentRoundCompetitors: [],
    matchQueue: [],
    winnersThisRound: [],
    autoAdvance: null,
    eliminations: [],
    totalMatches: 0,
    completedMatches: 0,
    championId: null,
  };
}

/** Das aktuelle Duell (oder null, wenn keins offen ist). */
export function getCurrentMatch(state: TournamentState): Matchup | null {
  return state.matchQueue[0] ?? null;
}

/**
 * Teilt Kontrahenten in 2er-Duelle. Bei ungerader Anzahl wird das LETZTE Bild
 * als `autoAdvance` geparkt (Freilos).
 */
export function buildRound(competitors: readonly ImageId[]): {
  matchQueue: Matchup[];
  autoAdvance: ImageId | null;
} {
  const autoAdvance = competitors.length % 2 === 1 ? (competitors.at(-1) ?? null) : null;
  const pairable = autoAdvance === null ? competitors : competitors.slice(0, -1);
  const matchQueue: Matchup[] = [];
  for (let i = 0; i < pairable.length; i += 2) {
    matchQueue.push([pairable[i]!, pairable[i + 1]!]);
  }
  return { matchQueue, autoAdvance };
}

function startRound(
  state: TournamentState,
  competitors: ImageId[],
  round: number,
): TournamentState {
  const { matchQueue, autoAdvance } = buildRound(competitors);
  return {
    ...state,
    view: 'match',
    round,
    currentRoundCompetitors: competitors,
    matchQueue,
    winnersThisRound: [],
    autoAdvance,
  };
}

/**
 * Beendet die Runde. Das geparkte Freilos-Bild kommt GANZ VORNE in die nächste
 * Runde, damit es sofort im ersten Duell antreten muss.
 * Bleibt nur 1 Bild übrig, endet das Turnier (Screen 4).
 */
export function advanceToNextRound(state: TournamentState): TournamentState {
  const nextCompetitors = [
    ...(state.autoAdvance !== null ? [state.autoAdvance] : []),
    ...state.winnersThisRound,
  ];

  if (nextCompetitors.length <= 1) {
    return {
      ...state,
      view: 'ranking',
      currentRoundCompetitors: nextCompetitors,
      matchQueue: [],
      winnersThisRound: [],
      autoAdvance: null,
      championId: nextCompetitors[0] ?? null,
    };
  }
  return startRound(state, nextCompetitors, state.round + 1);
}

/** Entfernt das aktuelle Duell; Sieger rückt vor, Runde endet bei leerer Queue. */
function resolveCurrentMatch(
  state: TournamentState,
  winnerId: ImageId,
  loserId: ImageId,
  reason: 'lost' | 'excluded',
): TournamentState {
  const next: TournamentState = {
    ...state,
    matchQueue: state.matchQueue.slice(1),
    winnersThisRound: [...state.winnersThisRound, winnerId],
    eliminations: [...state.eliminations, { imageId: loserId, round: state.round, reason }],
    // Ein Ausschluss ersetzt ein Duell: es wird nie gespielt, also sinkt die Gesamtzahl.
    completedMatches: state.completedMatches + (reason === 'lost' ? 1 : 0),
    totalMatches: state.totalMatches - (reason === 'excluded' ? 1 : 0),
  };
  return next.matchQueue.length === 0 ? advanceToNextRound(next) : next;
}

export function tournamentReducer(
  state: TournamentState,
  action: TournamentAction,
): TournamentState {
  switch (action.type) {
    case 'GO_TO_UPLOAD':
      return { ...state, view: 'upload' };

    case 'IMAGES_ADDED': {
      if (state.view !== 'upload') return state;
      const images = { ...state.images };
      for (const img of action.images) images[img.id] = img;
      return {
        ...state,
        images,
        imageOrder: [...state.imageOrder, ...action.images.map((i) => i.id)],
      };
    }

    case 'IMAGE_REMOVED': {
      if (state.view !== 'upload' || !(action.imageId in state.images)) return state;
      const { [action.imageId]: _removed, ...images } = state.images;
      return {
        ...state,
        images,
        imageOrder: state.imageOrder.filter((id) => id !== action.imageId),
      };
    }

    case 'START_TOURNAMENT': {
      const order = action.order.filter((id) => id in state.images);
      if (state.view !== 'upload' || order.length < 2) return state;
      return startRound(
        {
          ...state,
          eliminations: [],
          championId: null,
          totalMatches: order.length - 1, // jedes Duell eliminiert genau 1 Bild
          completedMatches: 0,
        },
        order,
        1,
      );
    }

    case 'PICK_WINNER': {
      const match = getCurrentMatch(state);
      if (state.view !== 'match' || !match || !match.includes(action.winnerId)) return state;
      const loserId = match[0] === action.winnerId ? match[1] : match[0];
      return resolveCurrentMatch(state, action.winnerId, loserId, 'lost');
    }

    case 'EXCLUDE_IMAGE': {
      const match = getCurrentMatch(state);
      if (state.view !== 'match' || !match || !match.includes(action.imageId)) return state;
      const winnerId = match[0] === action.imageId ? match[1] : match[0];
      return resolveCurrentMatch(state, winnerId, action.imageId, 'excluded');
    }

    case 'ABORT_TO_UPLOAD':
      return {
        ...createInitialState(),
        view: 'upload',
        images: state.images,
        imageOrder: state.imageOrder,
      };

    case 'RESET':
      return { ...createInitialState(), view: action.view };
  }
}
