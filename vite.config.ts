import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Vendory rozbite na grupy, które zmieniają się w różnym tempie —
        // dzięki temu upgrade react-day-pickera nie unieważnia cache'u Reacta.
        // Dopasowanie po ścieżce, nie po nazwie pakietu: wariant tablicowy
        // zostawiał react-dom w chunku wejściowym, bo aplikacja importuje
        // react-dom/client, a nie sam react-dom.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router)/.test(id)) {
            return 'react';
          }
          if (/[\\/]node_modules[\\/](radix-ui|@radix-ui)/.test(id)) return 'radix';
          if (/[\\/]node_modules[\\/](react-day-picker|date-fns)/.test(id)) return 'calendar';
        },
      },
    },
  },
});
