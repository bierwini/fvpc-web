import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { BlobRegistry } from './blobRegistry';
import { createInitialState, getCurrentMatch, tournamentReducer } from './engine';
import { computeRanking } from './ranking';
import { getStartOrder } from './shuffle';
import type { ImageId, TournamentImage } from './types';

export function useTournament() {
  const [state, dispatch] = useReducer(tournamentReducer, undefined, createInitialState);
  /** Shuffle-Toggle aus Screen 2, standardmäßig aktiv. */
  const [shuffleEnabled, setShuffleEnabled] = useState(true);
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
    dispatch({ type: 'START_TOURNAMENT', order: getStartOrder(state.imageOrder, shuffleEnabled) });
  }, [state.imageOrder, shuffleEnabled]);

  const pickWinner = useCallback(
    (winnerId: ImageId) => dispatch({ type: 'PICK_WINNER', winnerId }),
    [],
  );

  const excludeCurrentImage = useCallback(
    (imageId: ImageId) => dispatch({ type: 'EXCLUDE_IMAGE', imageId }),
    [],
  );

  const goToIntro = useCallback(() => dispatch({ type: 'GO_TO_INTRO' }), []);

  /** Close im Match/Ranking: gibt ALLE Blobs frei, zurück zum Intro. */
  const resetTournament = useCallback(() => {
    blobs.revokeAll();
    dispatch({ type: 'RESET', view: 'intro' });
  }, [blobs]);

  /** Next Game: gibt ALLE Blobs frei, direkt zum Upload. */
  const startNewTournament = useCallback(() => {
    blobs.revokeAll();
    dispatch({ type: 'RESET', view: 'upload' });
  }, [blobs]);

  const currentMatch = getCurrentMatch(state);
  const ranking = useMemo(
    () => (state.view === 'ranking' ? computeRanking(state.championId, state.eliminations) : []),
    [state.view, state.championId, state.eliminations],
  );

  return {
    state,
    currentMatch,
    ranking,
    shuffleEnabled,
    actions: {
      goToUpload,
      addFiles,
      removeImage,
      startTournament,
      pickWinner,
      excludeCurrentImage,
      setShuffleEnabled,
      goToIntro,
      resetTournament,
      startNewTournament,
    },
  };
}
