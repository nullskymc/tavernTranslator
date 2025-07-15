import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: [
        'vue',
        'pinia',
        '@vueuse/core'
      ],
      dts: 'auto-imports.d.ts' // 指定文件名
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'components.d.ts' // 指定文件名
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  server: {
    port: 3000,
    proxy: {
      // 代理所有 /api/v1 的请求到后端
      '/api/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'pinia', 'axios', 'element-plus']
        }
      }
    }
  }
})
