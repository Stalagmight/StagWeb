// Writes release data into the HTML at build time:
//
// - /releases/: the full list, rendered by the same code the browser uses
//   (src/js/changelog-render.js) under linkedom. Crawlers that never run
//   JavaScript (GPTBot, ClaudeBot, PerplexityBot) saw only "Loading releases…"
//   before. The browser still asks GitHub and redraws if anything changed.
// - the home page's structured data: softwareVersion and dateModified of the
//   release the main page offers.
//
// The download buttons are left to the browser, as before (docs/downloads.md).
import { parseHTML, DOMParser } from 'linkedom';
import { renderVersions, fingerprint } from '../src/js/changelog-render.js';
import { releaseData } from './releases-data.js';

const LIST = /(<div class="rel-list" id="releases")>[\s\S]*?(<\/div>)/;
const LD = /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/;

function renderList(versions) {
  const { document } = parseHTML('<!doctype html><html><head></head><body></body></html>');
  const parser = new DOMParser();
  const env = { doc: document, parse: html => parser.parseFromString(html, 'text/html') };
  return renderVersions(versions, env).map(el => el.outerHTML).join('\n');
}

function snapshotList(html, versions) {
  if (!LIST.test(html)) throw new Error('releases snapshot: <div class="rel-list" id="releases"> not found');
  // An empty list stays as the browser would show it, so nothing to bake in.
  if (!versions.length) return html;
  const body = renderList(versions);
  return html.replace(LIST, (_, open, close) =>
    `${open} data-snapshot="${fingerprint(versions)}">\n${body}\n${close}`);
}

function stampVersion(html, current) {
  const m = LD.exec(html);
  if (!m) throw new Error('releases snapshot: no JSON-LD block on the home page');
  const data = JSON.parse(m[2]);
  const app = (data['@graph'] || [data]).find(n => n['@type'] === 'SoftwareApplication');
  if (!app) throw new Error('releases snapshot: no SoftwareApplication in the JSON-LD');
  app.softwareVersion = current.version;
  if (current.date) app.dateModified = current.date;
  // "<" escaped so no string in the data can ever close the script element.
  const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
  return html.replace(LD, (_, open, __, close) => `${open}\n${json}\n${close}`);
}

export default function releasesSnapshot() {
  return {
    name: 'releases-snapshot',
    transformIndexHtml: {
      // After vite-plugin-html-inject has inlined the partials.
      order: 'post',
      async handler(html, ctx) {
        const page = ctx.path.replace(/index\.html$/, '');
        if (page !== '/' && page !== '/releases/') return html;
        const data = await releaseData();
        if (!data) return html;
        if (page === '/releases/') return snapshotList(html, data.versions);
        return data.current ? stampVersion(html, data.current) : html;
      },
    },
  };
}
