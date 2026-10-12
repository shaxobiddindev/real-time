/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Nisbiy yo'l: sayt GitHub Pages'da ham, istalgan papkada ham ishlaydi.
  base: './',
  test: {
    environment: 'node',
  },
});
