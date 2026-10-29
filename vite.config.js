import { defineConfig } from 'vite'
import htmlInject from 'vite-plugin-html-inject'

export default defineConfig({
  root: 'src',
  // Relative, like every hand-written asset URL, so the bundled scripts load at
  // the domain root, under a github.io project path and on the VPN copy alike.
  base: './',
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
