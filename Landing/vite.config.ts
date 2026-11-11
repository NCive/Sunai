import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: env.VITE_BASE || '/',
    server: {
      port: 5174,
      host: true,
    },
    preview: {
      port: 5174,
      host: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three'],
            motion: ['framer-motion'],
            vendor: ['react', 'react-dom', 'lucide-react', 'lenis'],
          },
        },
      },
    },
  };
});
