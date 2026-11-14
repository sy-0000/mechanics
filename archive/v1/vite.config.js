import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        teacher: resolve(__dirname, 'teacher.html'),
      },
    },
  },
  server: {
    host: true,
  },
});
