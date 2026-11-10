import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Custom Vite plugin to serve offline Silero VAD & ONNX Runtime Web static assets
 * (.mjs, .wasm, .onnx, .js) directly before Vite's module transformation middleware.
 * This prevents Vite from throwing ERR_LOAD_PUBLIC_URL when ONNX Runtime dynamically
 * imports 'ort-wasm-simd-threaded.mjs' from the browser.
 */
function serveVadAssets(): Plugin {
  return {
    name: 'serve-vad-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url ? req.url.split('?')[0] : '';
        if (rawUrl.startsWith('/vad/')) {
          const filePath = path.resolve(__dirname, 'public', rawUrl.slice(1));
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            if (rawUrl.endsWith('.mjs') || rawUrl.endsWith('.js')) {
              res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            } else if (rawUrl.endsWith('.wasm')) {
              res.setHeader('Content-Type', 'application/wasm');
            } else if (rawUrl.endsWith('.onnx')) {
              res.setHeader('Content-Type', 'application/octet-stream');
            }
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }
        next();
      });
    },
    resolveId(id) {
      if (id.startsWith('/vad/')) {
        return path.resolve(__dirname, 'public', id.slice(1));
      }
      return null;
    },
    load(id) {
      if (id.includes('ort-wasm') && (id.endsWith('.mjs') || id.endsWith('.js'))) {
        return fs.readFileSync(id, 'utf-8');
      }
      return null;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serveVadAssets()],
  assetsInclude: ['**/*.onnx', '**/*.wasm'],
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: false,
    },
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
});
