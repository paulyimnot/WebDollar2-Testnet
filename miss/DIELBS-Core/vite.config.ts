import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'events', 'stream', 'util', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "./replit_frontend/attached_assets"),
      "@blockchain": path.resolve(__dirname, "./src"),
      "drizzle-orm/pg-core": path.resolve(__dirname, "./node_modules/drizzle-orm/pg-core/index.js"),
      "drizzle-zod": path.resolve(__dirname, "./node_modules/drizzle-zod/index.mjs"),
    },
  },
  define: {
    // necessary for some dependencies expecting global window object props
    'process.env': {}
  },
  server: {
    host: true, // Expose to local network IP
  }
});
