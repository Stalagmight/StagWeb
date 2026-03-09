import { defineConfig } from 'vite'
import htmlInject from 'vite-plugin-html-inject'

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  plugins: [htmlInject()],
  server: {
    host: '10.10.0.220',
    port: 8084,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
