import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Single-page app: every clean route (/login, /student-360, /courses, /hostel)
// is served by index.html and resolved client-side by React Router. Vite's dev
// and preview servers already fall back to index.html for unknown paths, so no
// custom middleware is needed here (unlike vegaPilot, which multiplexes several
// entry HTML files).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: '/student-360',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
