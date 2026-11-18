import { fileURLToPath, URL } from 'node:url';
import { VantResolver } from '@vant/auto-import-resolver';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 直接引用共享包源码，开发时改动即时生效
      '@moments/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  plugins: [
    vue(),
    Components({ resolvers: [VantResolver()], dts: false }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '朋友圈拼图',
        short_name: '朋友圈拼图',
        description: '九宫格、拼图、切图、留白边框，一键排好发朋友圈',
        lang: 'zh-CN',
        theme_color: '#07c160',
        background_color: '#f6f6f6',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          {
            // 模板列表：优先网络，断网时用缓存
            urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/templates'),
            handler: 'NetworkFirst',
            options: { cacheName: 'api-templates', networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'node',
  },
});
