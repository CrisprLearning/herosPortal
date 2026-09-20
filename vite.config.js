import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Single-page app: every clean route (/login, /performance, /courses, /hostel)
// is served by index.html and resolved client-side by React Router. Vite's dev
// and preview servers already fall back to index.html for unknown paths, so no
// custom middleware is needed here (unlike vegaPilot, which multiplexes several
// entry HTML files).
// Sub-path the built site is served from. Locally '/', on GitHub Pages
// '/herosPortal/' (set by .github/workflows/deploy-pages.yml).
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5174,
    open: '/performance',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
