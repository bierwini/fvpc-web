import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { BlobRegistry } from './blobRegistry';
import { createInitialState, getCurrentMatch, tournamentReducer } from './engine';
import { computeRanking, getExcludedIds } from './ranking';
import type { ImageId, TournamentImage } from './types';

function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function useTournament() {
  const [state, dispatch] = useReducer(tournamentReducer, undefined, createInitialState);
  // Lazy init: genau eine Registry pro Hook-Instanz.
  const [blobs] = useState(() => new BlobRegistry());

  // Aufräumen beim Unmount der App.
  useEffect(() => () => blobs.revokeAll(), [blobs]);

  const goToUpload = useCallback(() => dispatch({ type: 'GO_TO_UPLOAD' }), []);

  const addFiles = useCallback(
    (files: Iterable<File>) => {
      const images: TournamentImage[] = [];
      for (const file of files) {
        if (file.type.startsWith('image/')) images.push(blobs.register(file));
      }
      if (images.length > 0) dispatch({ type: 'IMAGES_ADDED', images });
    },
    [blobs],
  );

  const removeImage = useCallback(
    (imageId: ImageId) => {
      blobs.revoke(imageId);
      dispatch({ type: 'IMAGE_REMOVED', imageId });
    },
    [blobs],
  );

  const startTournament = useCallback(() => {
    dispatch({ type: 'START_TOURNAMENT', order: shuffle(state.imageOrder) });
  }, [state.imageOrder]);

  const pickWinner = useCallback(
    (winnerId: ImageId) => dispatch({ type: 'PICK_WINNER', winnerId }),
    [],
  );

  const excludeCurrentImage = useCallback(
    (imageId: ImageId) => dispatch({ type: 'EXCLUDE_IMAGE', imageId }),
    [],
  );

  /** Manueller Reset / Abbruch: gibt ALLE Blobs frei, zurück zum Intro. */
  const resetTournament = useCallback(() => {
    blobs.revokeAll();
    dispatch({ type: 'RESET', view: 'intro' });
  }, [blobs]);

  /** Neues Turnier: gibt ALLE Blobs frei, direkt zum Upload. */
  const startNewTournament = useCallback(() => {
    blobs.revokeAll();
    dispatch({ type: 'RESET', view: 'upload' });
  }, [blobs]);

  const currentMatch = getCurrentMatch(state);
  const ranking = useMemo(
    () => (state.view === 'ranking' ? computeRanking(state.championId, state.eliminations) : []),
    [state.view, state.championId, state.eliminations],
  );
  const excludedIds = useMemo(() => getExcludedIds(state.eliminations), [state.eliminations]);

  return {
    state,
    currentMatch,
    ranking,
    excludedIds,
    actions: {
      goToUpload,
      addFiles,
      removeImage,
      startTournament,
      pickWinner,
      excludeCurrentImage,
      resetTournament,
      startNewTournament,
    },
  };
}
