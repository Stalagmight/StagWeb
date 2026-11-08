// Generates sitemap.xml from the build's own page list (rollupOptions.input),
// so a page added there is in the sitemap without anyone remembering to list
// it. Each URL carries a real <lastmod>: Google and Bing ignore priority and
// changefreq, but use lastmod when it is honest.
//
// lastmod is the last commit that touched the page itself or a content
// partial it loads. The shared chrome (nav, footer, base styles) is left out:
// a footer tweak is not a reason to recrawl every page. /releases/ also counts
// its newest release, since that changes the page with no commit here.
//
// CI must check out full history (fetch-depth: 0). In a shallow clone every
// path's last commit is the clone's one commit.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { releaseData } from './releases-data.js';

const LAYOUT = new Set(['partials/nav.html', 'partials/footer.html', 'partials/style-base.html']);

function lastCommit(files) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...files], { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function loadedPartials(root, file) {
  const html = fs.readFileSync(file, 'utf8');
  return [...html.matchAll(/<load\s[^>]*src="([^"]+)"/g)]
    .map(m => m[1])
    .filter(src => !LAYOUT.has(src))
    .map(src => path.join(root, src));
}

const latest = (...dates) => dates.filter(Boolean).sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;

// `lastmod(file)` may supply a date for pages whose history is not in this
// repository (the generated docs pages); anything it leaves undefined is dated
// from git here.
export default function sitemap({ site, lastmod: dateOf = () => undefined }) {
  let config;
  return {
    name: 'sitemap',
    apply: 'build',
    configResolved(c) { config = c; },
    async generateBundle() {
      const input = config.build.rollupOptions.input;
      const files = Object.values(typeof input === 'string' ? { main: input } : input)
        .map(f => path.resolve(f))
        .filter(f => f.endsWith('.html'));
      const data = await releaseData();

      const urls = files.map(file => {
        const rel = path.relative(config.root, file).split(path.sep).join('/');
        const loc = site + rel.replace(/(^|\/)index\.html$/, '$1');
        let lastmod = dateOf(file) || lastCommit([file, ...loadedPartials(config.root, file)]);
        if (rel === 'releases/index.html' && data?.versions[0]) lastmod = latest(lastmod, data.versions[0].date);
        return { loc, lastmod };
      }).sort((a, b) => a.loc.localeCompare(b.loc));

      const body = urls.map(({ loc, lastmod }) =>
        `  <url>\n    <loc>${loc}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}  </url>`).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
      });
    },
  };
}
