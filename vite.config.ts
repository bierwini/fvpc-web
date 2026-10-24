import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const page = (path: string) => new URL(path, import.meta.url).pathname;

// CSP nur für die Web-App: Bilder kommen ausschließlich als blob:, kein Netzwerkzugriff (connect-src 'none').
// Nur im Build, damit der Vite-Dev-Server (HMR, Inline-Preamble) unberührt bleibt.
const appCsp = {
  name: 'app-csp',
  apply: 'build' as const,
  transformIndexHtml: {
    order: 'post' as const,
    handler(html: string, ctx: { filename: string }) {
      if (!ctx.filename.replace(/\\/g, '/').endsWith('/app/index.html')) return html;
      const csp =
        "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`);
    },
  },
};

// base './' => statisches Hosting in beliebigem Unterpfad (z. B. GitHub Pages)
// Mehrere Seiten: Landingpage (/), Web-App (/app/) und Platzhalter für Rechtstexte.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), appCsp],
  build: {
    rollupOptions: {
      input: {
        landing: page('./index.html'),
        app: page('./app/index.html'),
        terms: page('./terms/index.html'),
        privacy: page('./privacy/index.html'),
        imprint: page('./imprint/index.html'),
        contact: page('./contact/index.html'),
      },
    },
  },
});
