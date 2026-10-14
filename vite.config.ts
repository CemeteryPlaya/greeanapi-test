import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // относительные пути, чтобы сборку можно было открыть с любого хостинга (GitHub Pages и т.п.)
  base: './',
});
