import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://harryzhong.com',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@duckdb/duckdb-wasm'],
    },
  },
  integrations: [react()],
});
