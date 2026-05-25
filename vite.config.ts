import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appName = env.VITE_APP_NAME ?? 'PresupuestoHogar';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: [
          'favicon.svg',
          'robots.txt',
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/icon-maskable.png',
        ],
        manifest: {
          name: appName,
          short_name: appName,
          description:
            'Aplicativo de presupuesto colaborativo para hogares: ingresos, gastos, aportes y metas en un solo lugar.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          lang: env.VITE_DEFAULT_LOCALE ?? 'es',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/icon-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
                cacheableResponse: { statuses: [0, 200] },
                networkTimeoutSeconds: 5,
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: false,
      open: false,
    },
    build: {
      sourcemap: mode !== 'production',
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'chart-vendor': ['chart.js', 'react-chartjs-2'],
            'calendar-vendor': [
              '@fullcalendar/core',
              '@fullcalendar/react',
              '@fullcalendar/daygrid',
              '@fullcalendar/timegrid',
              '@fullcalendar/list',
              '@fullcalendar/interaction',
            ],
            'supabase-vendor': ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
});
