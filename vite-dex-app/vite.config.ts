import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      include: ['buffer', 'stream', 'util', 'crypto', 'process', 'events'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  build: { outDir: 'dist', sourcemap: false, target: 'esnext' },
  define: {
    'process.env.BROWSER': JSON.stringify(true),
    'process.env.NODE_DEBUG': JSON.stringify(''),
    'global': 'globalThis',
  },
})
