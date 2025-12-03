import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/v1': 'http://localhost:3001',
      '/api': 'http://localhost:3001',
      '/cards': {
        target: 'http://localhost:3002',
        rewrite: (path) => path.replace(/^\/cards/, ''),
      },
      '/uploads': 'http://localhost:3002',
    },
  },
});


