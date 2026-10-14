import { LegalCaption } from '../components/LegalCaption';

export function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="screen screen--intro">
      <header>
        <h1>Photo Tournament</h1>
        <p className="subtitle">Find your favorite photo, one duel at a time.</p>
      </header>

      {/* Nimmt den freien vertikalen Platz ein. */}
      <section className="intro__body" aria-label="How it works">
        <ul>
          <li>Placeholder benefit 1</li>
          <li>Placeholder benefit 2</li>
          <li>Placeholder benefit 3</li>
          <li>Placeholder benefit 4</li>
        </ul>
        <ul>
          <li>Placeholder note</li>
        </ul>
      </section>

      <footer>
        <LegalCaption />
        <button type="button" className="primary" onClick={onStart}>
          Start
        </button>
      </footer>
    </main>
  );
}
