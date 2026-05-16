import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@netlink/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@netlink/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
  // Tauri dev server settings
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Watch workspace packages for changes
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
}));
