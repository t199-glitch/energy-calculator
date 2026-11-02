import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base: './' 讓建置後的 dist 可放在任何子目錄（例如學校網站或 GitHub Pages）
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    // Recharts（圖表函式庫）單獨一包約 550 kB（gzip 約 160 kB），屬正常範圍
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
        },
      },
    },
  },
});
