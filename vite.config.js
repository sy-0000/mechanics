import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  server: { host: true, fs: { allow: ['.'] } },
  build: {
    outDir: 'dist', target: 'es2022', chunkSizeWarningLimit: 2500,
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), vr: resolve(__dirname, 'vr.html'), teacher: resolve(__dirname, 'teacher.html') } },
  },
});
