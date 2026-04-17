import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false, // Electron opens the app, not the browser
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
