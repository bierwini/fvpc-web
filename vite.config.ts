import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const page = (path: string) => new URL(path, import.meta.url).pathname;

// base './' => statisches Hosting in beliebigem Unterpfad (z. B. GitHub Pages)
// Mehrere Seiten: Landingpage (/), Web-App (/app/) und Platzhalter für Rechtstexte.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        landing: page('./index.html'),
        app: page('./app/index.html'),
        terms: page('./terms/index.html'),
        privacy: page('./privacy/index.html'),
        imprint: page('./imprint/index.html'),
      },
    },
  },
});
