import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the app from /clinqo/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/clinqo/',
});
