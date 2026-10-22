export type ImageId = string;

/** Die 4 Screens: 1 = Intro, 2 = Upload, 3 = Tournament Match, 4 = Endranking. */
export type View = 'intro' | 'upload' | 'match' | 'ranking';

export interface TournamentImage {
  id: ImageId;
  name: string;
  /** Blob-URL aus URL.createObjectURL(file). Lebt bis zum Reset (siehe BlobRegistry). */
  url: string;
}

export type Matchup = readonly [ImageId, ImageId];

export type EliminationReason = 'lost' | 'excluded';

export interface Elimination {
  imageId: ImageId;
  /** Runde (1-basiert), in der das Bild ausgeschieden ist. */
  round: number;
  /** 'lost' = Duell verloren (zählt im Ranking), 'excluded' = manuell ausgeschlossen (kein Rang). */
  reason: EliminationReason;
}

export interface TournamentState {
  view: View;

  // --- Bilder ---
  images: Record<ImageId, TournamentImage>;
  /** Upload-Reihenfolge; Quelle für den Turnierstart. */
  imageOrder: ImageId[];

  // --- Turnierverlauf ---
  /** Aktuelle Runde, 1-basiert. 0 = Turnier noch nicht gestartet. */
  round: number;
  currentRoundCompetitors: ImageId[];
  /** Offene Duelle der Runde. Das aktuelle Duell ist matchQueue[0]. */
  matchQueue: Matchup[];
  winnersThisRound: ImageId[];
  /** Bei ungerader Anzahl geparktes Bild (Freilos); null, wenn keins. */
  autoAdvance: ImageId | null;
  eliminations: Elimination[];

  // --- Fortschritt ---
  /** Insgesamt erwartete Duelle: n - 1, minus 1 je Ausschluss. */
  totalMatches: number;
  completedMatches: number;

  /** Gesetzt, sobald nur noch 1 Bild übrig ist. */
  championId: ImageId | null;
}

export type TournamentAction =
  | { type: 'GO_TO_UPLOAD' }
  | { type: 'IMAGES_ADDED'; images: TournamentImage[] }
  | { type: 'IMAGE_REMOVED'; imageId: ImageId }
  /** `order` wird vom Aufrufer (ggf. gemischt) geliefert, damit der Reducer rein bleibt. */
  | { type: 'START_TOURNAMENT'; order: ImageId[] }
  | { type: 'PICK_WINNER'; winnerId: ImageId }
  | { type: 'EXCLUDE_IMAGE'; imageId: ImageId }
  /** Zurück zum Startzustand. Die Blobs gibt der Aufrufer vorher frei. */
  | { type: 'RESET'; view: 'intro' | 'upload' };

export interface RankingEntry {
  imageId: ImageId;
  /** Dichter Rang: 1, 2, 3, 3, 4, 4, 4 … ohne Sprünge. */
  rank: number;
  /** Runde des Ausscheidens; null beim Sieger. */
  eliminatedInRound: number | null;
}

export interface AddFilesResult {
  added: number;
  /** Bereits geladene Dateien (gleicher Name, gleiche Größe, gleiches Änderungsdatum). */
  duplicates: number;
  /** Keine Bilddateien. */
  skipped: number;
  /** Über dem Limit von MAX_IMAGES Bildern. */
  overLimit: number;
  /** Einzelne Datei größer als MAX_FILE_BYTES. */
  tooLarge: number;
}

export const MAX_IMAGES = 500;
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
