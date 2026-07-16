import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: https://<user>.github.io/canvas-atelier/
// Override with VITE_BASE=/ for custom domains or root deploys.
export default defineConfig({
  base: process.env.VITE_BASE || '/canvas-atelier/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    sourcemap: true,
    target: 'es2022',
  },
});
