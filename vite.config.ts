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

// Sitemap, robots.txt, Canonical und Vorschaubild brauchen absolute URLs: nur mit SITE_URL (z. B. https://favopic.app) im Build.
declare const process: { env: Record<string, string | undefined> };
const siteUrl = process.env.SITE_URL?.replace(/\/+$/, '');
const pages = ['', 'contact/', 'terms/', 'privacy/', 'imprint/'];
const seo = {
  name: 'seo',
  apply: 'build' as const,
  transformIndexHtml: {
    order: 'post' as const,
    handler(html: string, ctx: { filename: string }) {
      if (!siteUrl) return html;
      const f = ctx.filename.replace(/\\/g, '/');
      if (f.endsWith('/app/index.html') || f.endsWith('/404.html')) return html;
      const dir = f.match(/\/(terms|privacy|imprint|contact)\/index\.html$/)?.[1] ?? '';
      const path = dir ? `${dir}/` : '';
      const tags = [`<link rel="canonical" href="${siteUrl}/${path}" />`, `<meta property="og:url" content="${siteUrl}/${path}" />`, `<meta property="og:image" content="${siteUrl}/landing/img/og.jpg" />`, `<meta name="twitter:image" content="${siteUrl}/landing/img/og.jpg" />`];
      return html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
    },
  },
  generateBundle(this: { emitFile(f: { type: 'asset'; fileName: string; source: string }): void }) {
    if (!siteUrl) return;
    const urls = pages.map((p) => `  <url><loc>${siteUrl}/${p}</loc></url>`).join('\n');
    this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` });
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n` });
  },
};

// base './' => statisches Hosting in beliebigem Unterpfad (z. B. GitHub Pages)
// Mehrere Seiten: Landingpage (/), Web-App (/app/) und Platzhalter für Rechtstexte.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), appCsp, seo],
  build: {
    rollupOptions: {
      input: {
        landing: page('./index.html'),
        app: page('./app/index.html'),
        terms: page('./terms/index.html'),
        privacy: page('./privacy/index.html'),
        imprint: page('./imprint/index.html'),
        contact: page('./contact/index.html'),
        notFound: page('./404.html'),
      },
    },
  },
});
