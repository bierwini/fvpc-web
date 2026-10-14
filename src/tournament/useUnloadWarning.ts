import { useEffect } from 'react';

/**
 * Fragt den Browser beim Neuladen/Schließen von Tab oder Fenster nach einer Bestätigung.
 * Nur aktiv, wenn etwas verloren ginge: alles liegt nur im Speicher (Blobs), nichts wird gespeichert.
 * Den Dialogtext bestimmt der Browser; eigene Texte sind aus Sicherheitsgründen nicht möglich.
 */
export function useUnloadWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // für ältere Browser
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);
}
