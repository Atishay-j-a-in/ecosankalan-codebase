import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function firebaseMessagingSwPlugin(env) {
  const serviceWorkerPath = path.resolve(process.cwd(), 'public', 'firebase-messaging-sw.js');

  const renderServiceWorker = (source) =>
    source
      .replaceAll('__VITE_FIREBASE_API_KEY__', env.VITE_FIREBASE_API_KEY || '')
      .replaceAll('__VITE_FIREBASE_AUTH_DOMAIN__', env.VITE_FIREBASE_AUTH_DOMAIN || '')
      .replaceAll('__VITE_FIREBASE_PROJECT_ID__', env.VITE_FIREBASE_PROJECT_ID || '')
      .replaceAll('__VITE_FIREBASE_STORAGE_BUCKET__', env.VITE_FIREBASE_STORAGE_BUCKET || '')
      .replaceAll('__VITE_FIREBASE_MESSAGING_SENDER_ID__', env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
      .replaceAll('__VITE_FIREBASE_APP_ID__', env.VITE_FIREBASE_APP_ID || '');

  return {
    name: 'firebase-messaging-sw-env',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/firebase-messaging-sw.js') {
          const source = fs.readFileSync(serviceWorkerPath, 'utf8');
          res.setHeader('Content-Type', 'application/javascript');
          res.end(renderServiceWorker(source));
          return;
        }
        next();
      });
    },
    writeBundle() {
      const source = fs.readFileSync(serviceWorkerPath, 'utf8');
      const outputPath = path.resolve(process.cwd(), 'build', 'firebase-messaging-sw.js');
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, renderServiceWorker(source));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), firebaseMessagingSwPlugin(env)],
    server: {
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'build',
    },
  };
});
