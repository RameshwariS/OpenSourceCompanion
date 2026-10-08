import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development, forward /api/* to the Express server
        proxy: {
      '/api': 'http://localhost:5000',
      // Socket.io connects to the same origin, so the cookie flows. `ws` enables WebSockets.
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});