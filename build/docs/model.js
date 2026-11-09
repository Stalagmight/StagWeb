// The user guide as a site: every Markdown file in the source folder becomes a
// page, every folder a section, and the links between pages are resolved,
// checked and counted in both directions.
//
// Conventions (also in the authoring guide, docs/user-guide/README.md in the
// app repo):
//   import/mnemo-dmp.md  -> /docs/import/mnemo-dmp/
//   import/index.md      -> /docs/import/   (the section's own page)
//   index.md             -> /docs/          (the landing page)
//   README.md            -> not published (the authoring guide itself)
//   draft: true          -> not published
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { imageSize } from 'image-size';
import { createMarkdown, sanitize } from './markdown.js';

const P = path.posix;
export const APP_REPO = 'https://github.com/Stalagmight/Stalagmight';
export const SOURCE_IN_REPO = 'docs/user-guide';
const BLOB = `${APP_REPO}/blob/master/`;

const FM = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

export function walk(dir, base = dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

function gitDate(dir, file) {
  try {
    return execFileSync('git', ['-C', dir, 'log', '-1', '--format=%cI', '--', file],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch { return null; }
}

// URL segments are lowercase words joined by hyphens, whatever the file is called.
const segment = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function routeOf(rel) {
  const parts = rel.replace(/\.md$/i, '').split('/').map(segment);
  if (parts[parts.length - 1] === 'index') parts.pop();
  return parts.length ? parts.join('/') + '/' : '';
}

const prettify = s => {
  const t = s.replace(/[-_]+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const asList = v => (v == null ? [] : Array.isArray(v) ? v : [v]).map(String);

function compareVersions(a, b) {
  const x = String(a).replace(/^v/i, '').split(/[.-]/).map(n => parseInt(n, 10) || 0);
  const y = String(b).replace(/^v/i, '').split(/[.-]/).map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d;
  }
  return 0;
}

// Relative URL from one docs route to another, both relative to /docs/.
export function relUrl(from, to) {
  const r = P.relative('/docs/' + from, '/docs/' + to);
  return r ? r + '/' : './';
}

// `images`: rel -> prepared WebP variants (build/docs/images.js). Images not in
// it (SVG, GIF) are copied as they are.
export function buildModel(dir, { currentVersion = null, images = new Map() } = {}) {
  const warnings = [];
  const warn = (rel, msg) => warnings.push({ file: rel, msg });
  const files = walk(dir);
  const fileSet = new Set(files);
  const md = createMarkdown();

  // ── Pages from files ──
  const pages = [];
  const byRel = new Map();
  const byRoute = new Map();
  for (const rel of files) {
    if (!/\.md$/i.test(rel) || /(^|\/)README\.md$/i.test(rel)) continue;
    const text = fs.readFileSync(path.join(dir, rel), 'utf8');
    let data = {};
    let body = text;
    const m = FM.exec(text);
    if (m) {
      try { data = YAML.parse(m[1]) || {}; } catch (e) { warn(rel, `front matter is not valid YAML, ignored: ${e.message.split('\n')[0]}`); }
      if (typeof data !== 'object' || Array.isArray(data)) { warn(rel, 'front matter must be key: value pairs, ignored'); data = {}; }
      body = text.slice(m[0].length);
    }
    if (data.draft) continue;
    const route = routeOf(rel);
    if (byRoute.has(route)) { warn(rel, `same URL /docs/${route} as ${byRoute.get(route).rel}; skipped`); continue; }
    const page = { rel, route, data, body, updated: gitDate(dir, rel), auto: false };
    pages.push(page);
    byRel.set(rel, page);
    byRoute.set(route, page);
  }
  if (!pages.length) return null;

  // Every folder gets a page, written or not, so breadcrumbs and section links
  // always lead somewhere.
  for (const p of [...pages]) {
    const parts = p.route.split('/').filter(Boolean);
    for (let i = parts.length - (p.route.endsWith('/') ? 1 : 0); i >= 0; i--) {
      const route = parts.slice(0, i).join('/') + (i ? '/' : '');
      if (route === p.route || byRoute.has(route)) continue;
      const auto = { rel: null, route, data: {}, body: '', updated: null, auto: true };
      pages.push(auto);
      byRoute.set(route, auto);
    }
  }

  const parentOf = route => {
    if (!route) return null;
    const parts = route.split('/').filter(Boolean);
    parts.pop();
    return parts.length ? parts.join('/') + '/' : '';
  };

  // ── Parse: titles, outlines, anchors ──
  for (const p of pages) {
    const name = p.route.split('/').filter(Boolean).pop();
    if (p.auto) {
      p.title = name ? prettify(name) : 'Documentation';
      p.headings = [];
      continue;
    }
    p.env = {};
    p.tokens = md.parse(p.body, p.env);
    p.headings = p.env.headings;
    p.title = String(p.data.title || p.env.leadTitle || (name ? prettify(name) : 'Documentation'));
    let desc = p.data.description ? String(p.data.description) : p.env.firstParagraph;
    if (!p.data.description) {
      if (!desc) warn(p.rel, 'no description: add `description:` to the front matter');
      if (desc.length > 160) desc = desc.slice(0, 157).replace(/\s+\S*$/, '') + '…';
    }
    p.description = desc;
    p.ids = new Set(p.headings.map(h => h.id));
  }
  for (const p of pages) {
    p.parent = parentOf(p.route);
    p.order = Number.isFinite(Number(p.data.order)) ? Number(p.data.order) : Infinity;
    p.tags = asList(p.data.tags).map(t => t.toLowerCase());
    if (p.auto && !p.description) {
      const kids = pages.filter(c => parentOf(c.route) === p.route);
      p.description = `${p.title}: ${kids.map(k => k.title).join(', ')}.`;
    }
  }

  // ── Tree and reading order ──
  const sortKids = arr => arr.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const childrenOf = route => sortKids(pages.filter(c => c.route !== route && c.parent === route));
  const root = byRoute.get('');
  const tree = (function node(p) { return { page: p, children: childrenOf(p.route).map(node) }; })(root);
  const sequence = [];
  (function flat(n) { for (const c of n.children) { if (!c.page.auto) sequence.push(c.page); flat(c); } })(tree);
  sequence.forEach((p, i) => { p.prev = sequence[i - 1] || null; p.next = sequence[i + 1] || null; });

  // ── Render, resolving every link ──
  const assets = new Map();   // source rel -> { kind: 'image' | 'file' }
  const resolveTarget = (fromRel, href) => {
    const [rawPath, hash = ''] = href.split('#');
    let target;
    try { target = decodeURIComponent(rawPath); } catch { target = rawPath; }
    const resolved = P.normalize(P.join(P.dirname(fromRel), target));
    return { resolved, hash, rawPath };
  };

  for (const p of pages) {
    if (p.auto) continue;
    p.links = new Set();
    const linkWarn = msg => { warn(p.rel, msg); return { broken: msg }; };
    p.env.resolveLink = href => {
      if (!href) return { href };
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return { href, external: true };
      if (href.startsWith('/')) return { href };
      if (href.startsWith('#')) {
        const id = decodeURIComponent(href.slice(1));
        if (id && !p.ids.has(id)) return linkWarn(`no heading #${id} on this page`);
        return { href };
      }
      const { resolved, hash } = resolveTarget(p.rel, href);
      if (resolved.startsWith('../')) {
        // Outside the user guide but inside the repo: link to it on GitHub.
        const inRepo = P.normalize(P.join(SOURCE_IN_REPO, resolved));
        if (inRepo.startsWith('../')) return linkWarn(`${href} points outside the repository`);
        return { href: BLOB + inRepo + (hash ? '#' + hash : ''), external: true };
      }
      let page = null;
      if (/\.md$/i.test(resolved)) {
        if (/(^|\/)README\.md$/i.test(resolved)) {
          return fileSet.has(resolved)
            ? { href: BLOB + P.join(SOURCE_IN_REPO, resolved), external: true }
            : linkWarn(`${href} does not exist`);
        }
        page = byRel.get(resolved);
        if (!page) return linkWarn(fileSet.has(resolved) ? `${href} is a draft or unpublished` : `${href} does not exist`);
      } else if (href.endsWith('/') || !fileSet.has(resolved)) {
        // A folder: its section page.
        const base = resolved.replace(/\/+$/, '');
        const route = base === '' || base === '.' ? '' : routeOf(base + '/index.md');
        page = byRoute.get(route);
        if (!page) return linkWarn(`${href} does not exist`);
      } else {
        assets.set(resolved, assets.get(resolved) || { kind: 'file' });
        return { href: P.relative('/docs/' + p.route, '/docs/_files/' + resolved) + (hash ? '#' + hash : '') };
      }
      p.links.add(page.route);
      let anchor = '';
      if (hash) {
        const id = decodeURIComponent(hash);
        if (page.ids && !page.ids.has(id)) warn(p.rel, `${href}: no heading #${id} there; linking to the page`);
        else anchor = '#' + hash;
      }
      return { href: relUrl(p.route, page.route) + anchor, page };
    };
    p.env.resolveImage = src => {
      if (!src) return { broken: 'image with no source' };
      if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//') || src.startsWith('/')) return { src };
      const { resolved } = resolveTarget(p.rel, src);
      if (resolved.startsWith('../') || !fileSet.has(resolved)) { warn(p.rel, `image ${src} not found`); return { broken: `missing image ${src}` }; }
      const fromPage = P.join('docs', p.route);
      const prepared = images.get(resolved);
      if (prepared) {
        assets.set(resolved, { kind: 'image', optimized: true });
        const url = v => P.relative(fromPage, P.join('docs', v.file));
        return {
          src: url(prepared.variants[0]),
          srcset: prepared.variants.map(v => `${url(v)} ${v.w}w`).join(', '),
          sizes: '(max-width: 900px) calc(100vw - 2rem), 680px',
          width: prepared.width,
          height: prepared.height,
        };
      }
      assets.set(resolved, { kind: 'image' });
      let size = {};
      try { size = imageSize(fs.readFileSync(path.join(dir, resolved))); } catch {}
      // Relative to the generated page file, so Vite finds and fingerprints it.
      return { src: P.relative(P.join('docs', p.route), P.join('docs/_files', resolved)), width: size.width, height: size.height };
    };
    p.html = sanitize(md.renderer.render(p.tokens, md.options, p.env));
    p.related = [];
    for (const r of asList(p.data.related)) {
      const res = p.env.resolveLink(r);
      if (res.page && res.page !== p) p.related.push(res.page);
    }
    if (p.data.since && currentVersion && compareVersions(p.data.since, currentVersion) > 0) p.upcoming = String(p.data.since);
    else if (p.data.since && !currentVersion) p.requires = String(p.data.since);
  }

  // ── Backlinks and related topics ──
  for (const p of pages) p.backlinks = [];
  for (const p of pages) {
    if (p.auto) continue;
    for (const route of p.links) {
      const t = byRoute.get(route);
      if (t && t !== p && !t.backlinks.includes(p)) t.backlinks.push(p);
    }
  }
  for (const p of pages) {
    if (p.auto) continue;
    p.backlinks.sort((a, b) => a.title.localeCompare(b.title));
    if (p.tags.length && p.related.length < 6) {
      const scored = pages
        .filter(o => o !== p && !o.auto && !p.related.includes(o))
        .map(o => ({ o, n: o.tags.filter(t => p.tags.includes(t)).length }))
        .filter(x => x.n)
        .sort((a, b) => b.n - a.n || a.o.title.localeCompare(b.o.title));
      for (const { o } of scored.slice(0, 6 - p.related.length)) p.related.push(o);
    }
  }

  // ── Aliases (old URLs) ──
  const redirects = [];
  for (const p of pages) {
    for (const a of asList(p.data.aliases)) {
      const m2 = /^\/docs\/(.*?)\/?$/.exec(a);
      if (!m2) { warn(p.rel, `alias ${a} must start with /docs/`); continue; }
      const from = m2[1] ? m2[1].split('/').map(segment).join('/') + '/' : '';
      if (byRoute.has(from)) { warn(p.rel, `alias ${a} is already a page`); continue; }
      redirects.push({ from, to: p.route });
    }
  }

  // Auto section pages take their date from the newest page below them.
  for (const p of pages) {
    if (!p.auto) continue;
    p.updated = pages.filter(c => !c.auto && c.route.startsWith(p.route) && c.updated)
      .map(c => c.updated).sort().pop() || null;
  }

  return { pages, byRoute, tree, sequence, assets, redirects, warnings, childrenOf };
}
