import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { BlobRegistry } from './blobRegistry';
import { createInitialState, getCurrentMatch, tournamentReducer } from './engine';
import { computeRanking } from './ranking';
import { getStartOrder } from './shuffle';
import {
  MAX_FILE_BYTES,
  MAX_IMAGES,
  type AddFilesResult,
  type ImageId,
  type TournamentImage,
  type TournamentState,
} from './types';

/** Zustand vor der letzten Entscheidung (einstufiges Undo) und das Bild, das danach angezeigt wird (gewählt bzw. entfernt). */
interface UndoSnapshot {
  state: TournamentState;
  shownId: ImageId;
}

export function useTournament() {
  const [state, dispatch] = useReducer(tournamentReducer, undefined, createInitialState);
  /** Shuffle-Toggle aus Screen 2, standardmäßig aus. */
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  // Lazy init: genau eine Registry pro Hook-Instanz.
  const [blobs] = useState(() => new BlobRegistry());

  // Aufräumen beim Unmount der App.
  useEffect(() => () => blobs.revokeAll(), [blobs]);

  const goToUpload = useCallback(() => dispatch({ type: 'GO_TO_UPLOAD' }), []);

  const addFiles = useCallback(
    (files: Iterable<File>): AddFilesResult => {
      const images: TournamentImage[] = [];
      const result: AddFilesResult = { added: 0, duplicates: 0, skipped: 0, overLimit: 0, tooLarge: 0 };
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          result.skipped++;
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          result.tooLarge++;
          continue;
        }
        if (blobs.size >= MAX_IMAGES) {
          result.overLimit++;
          continue;
        }
        const image = blobs.register(file);
        if (image) images.push(image);
        else result.duplicates++;
      }
      result.added = images.length;
      if (images.length > 0) dispatch({ type: 'IMAGES_ADDED', images });
      return result;
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

  // Undo: Der Reducer ist unveränderlich, also genügt der vorige Zustand. Blobs werden während des Duells nie freigegeben.
  const stateRef = useRef(state);
  stateRef.current = state;
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  /** Nach Undo: welches Bild des Duells angezeigt werden soll; token zählt hoch, damit auch dasselbe Bild erneut wirkt. */
  const [undoFocus, setUndoFocus] = useState<{ id: ImageId; token: number } | null>(null);

  const pickWinner = useCallback((winnerId: ImageId) => {
    setUndoSnapshot({ state: stateRef.current, shownId: winnerId });
    dispatch({ type: 'PICK_WINNER', winnerId });
  }, []);

  const excludeCurrentImage = useCallback((imageId: ImageId) => {
    setUndoSnapshot({ state: stateRef.current, shownId: imageId });
    dispatch({ type: 'EXCLUDE_IMAGE', imageId });
  }, []);

  const undo = useCallback(() => {
    if (!undoSnapshot) return;
    dispatch({ type: 'RESTORE', state: undoSnapshot.state });
    setUndoFocus({ id: undoSnapshot.shownId, token: (undoFocus?.token ?? 0) + 1 });
    setUndoSnapshot(null);
  }, [undoSnapshot, undoFocus]);

  /** Close im Match/Ranking: gibt ALLE Blobs frei, zurück zum Intro. */
  const resetTournament = useCallback(() => {
    blobs.revokeAll();
    setUndoSnapshot(null);
    dispatch({ type: 'RESET', view: 'intro' });
  }, [blobs]);

  /** Next Game: gibt ALLE Blobs frei, direkt zum Upload. */
  const startNewTournament = useCallback(() => {
    blobs.revokeAll();
    setUndoSnapshot(null);
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
    /** Undo gibt es nur im Duell; die letzte Entscheidung führt direkt ins Ranking und kann nicht zurückgenommen werden. */
    canUndo: undoSnapshot !== null && state.view === 'match',
    undoFocus,
    actions: {
      undo,
      goToUpload,
      addFiles,
      removeImage,
      startTournament,
      pickWinner,
      excludeCurrentImage,
      setShuffleEnabled,
      resetTournament,
      startNewTournament,
    },
  };
}
