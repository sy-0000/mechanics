import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  server: { host: true },
  build: { rollupOptions: { input: { main: resolve(__dirname, 'index.html'), vr: resolve(__dirname, 'vr.html') } }, chunkSizeWarningLimit: 2000 },
});
