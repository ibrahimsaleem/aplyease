import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(import.meta.dirname, "client", "index.html")
    }
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: mode === 'development' ? {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    } : undefined,
  },
  define: {
    // Define API base URL for production
    __API_BASE_URL__: mode === 'production' 
      ? JSON.stringify(process.env.VITE_API_BASE_URL || 'https://your-backend-url.com')
      : JSON.stringify(''),
  },
}));
