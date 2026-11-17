import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

import scheduleHandler from './api/schedule';

function dvgupsProxyPlugin(): Plugin {
  const middleware = (
    req: import('http').IncomingMessage,
    res: import('http').ServerResponse,
    prefix: string
  ) => {
    // Preserve full path starting with /api/... when mounted under /api or /dvgups-proxy
    const rawUrl = req.url || '/';
    if (prefix === '/api') {
      req.url = `/api${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
    } else if (prefix === '/dvgups-proxy') {
      req.url = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    }
    void scheduleHandler(req, res);
  };

  return {
    name: 'dvgups-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        middleware(req, res, '/api');
      });
      server.middlewares.use('/dvgups-proxy', (req, res) => {
        middleware(req, res, '/dvgups-proxy');
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api', (req, res) => {
        middleware(req, res, '/api');
      });
      server.middlewares.use('/dvgups-proxy', (req, res) => {
        middleware(req, res, '/dvgups-proxy');
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    dvgupsProxyPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      buildBase: './',
      manifestFilename: 'manifest.webmanifest',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png', 'manifest.json'],
      manifest: {
        id: './',
        name: 'ДВГУПС Расписание',
        short_name: 'ДВГУПС',
        description: 'Быстрое расписание учебных групп ДВГУПС с мгновенным открытием, индикатором текущей пары и полным офлайн-доступом.',
        theme_color: '#09120F',
        background_color: '#09120F',
        display: 'standalone',
        orientation: 'portrait',
        scope: './',
        start_url: './',
        lang: 'ru',
        icons: [
          {
            src: './apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: './pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: './pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: './pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: './icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/dvgups-proxy\//],
        modifyURLPrefix: {
          '': './'
        },
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: false
  }
});
