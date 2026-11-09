import { defineConfig } from 'vite'
import htmlInject from 'vite-plugin-html-inject'
import releasesSnapshot from './build/releases-snapshot.js'
import sitemap from './build/sitemap.js'
import docs from './build/docs/index.js'

const site = 'https://stalagmight.com/'

// The user guide, built from the app repository's docs/user-guide/
// (docs/user-guide-pipeline.md). Off since 9 Nov 2026 while the guide gets more
// work: set to true to publish it at /docs/ again. A build with DOCS_SOURCE set
// (npm run build:fixtures, or a local checkout of the guide) still includes it,
// so the pipeline and the guide can be previewed meanwhile.
const PUBLISH_USER_GUIDE = false
const userGuide = docs({ site, enabled: PUBLISH_USER_GUIDE || Boolean(process.env.DOCS_SOURCE) })

export default defineConfig({
  root: 'src',
  // Relative, like every hand-written asset URL, so the bundled scripts load at
  // the domain root, under a github.io project path and on the VPN copy alike.
  base: './',
  publicDir: '../public',
  plugins: [
    htmlInject(),
    userGuide,
    releasesSnapshot(),
    sitemap({ site, lastmod: userGuide.lastmodFor }),
  ],
  server: {
    host: '10.10.0.220',
    port: 8084,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // One entry per page; each is served from its own directory's index.html.
    rollupOptions: {
      input: {
        main: 'src/index.html',
        changelog: 'src/releases/index.html',
      },
    },
  },
})
