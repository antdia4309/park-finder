import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The site lives at antdia4309.github.io/park-finder/
  base: '/park-finder/',
  build: {
    // Keep CRA's folder name so the deploy workflow doesn't need to change.
    outDir: 'build',
    // The bundled park data (src/data/parks.json) makes the main file large.
    // Loading that data separately would shrink it; until then, don't warn.
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    css: false,
  },
});
