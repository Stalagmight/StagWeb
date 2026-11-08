// HTML for the generated docs pages. They are written into src/docs/ and built
// by Vite like any other page, so the shared partials, fonts and fingerprinted
// assets work exactly as on the home page; `root` is the relative path from a
// page's file back to src/.
import { esc } from './markdown.js';
import { relUrl, APP_REPO, SOURCE_IN_REPO } from './model.js';

const json = data => JSON.stringify(data, null, 2).replace(/</g, '\\u003c');

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function ancestors(p, model) {
  const chain = [];
  for (let r = p.parent; r != null; r = model.byRoute.get(r)?.parent) {
    const a = model.byRoute.get(r);
    if (!a) break;
    chain.unshift(a);
  }
  return chain;
}

function tree(node, current) {
  const items = node.children.map(c => {
    const here = c.page === current;
    const link = `<a href="${relUrl(current.route, c.page.route)}"${here ? ' aria-current="page"' : ''}>${esc(c.page.title)}</a>`;
    if (!c.children.length) return `<li>${link}</li>`;
    const open = current.route.startsWith(c.page.route);
    return `<li class="docs-sec${open ? ' is-open' : ''}">${link}${tree(c, current)}</li>`;
  });
  return items.length ? `<ul>${items.join('')}</ul>` : '';
}

function cards(list, current, cls) {
  return `<ul class="${cls}">${list.map(o =>
    `<li><a href="${relUrl(current.route, o.route)}"><span class="docs-card-title">${esc(o.title)}</span>${o.description ? `<span class="docs-card-desc">${esc(o.description)}</span>` : ''}</a></li>`).join('')}</ul>`;
}

export function renderPage(p, model, { site, currentVersion }) {
  const depth = p.route.split('/').filter(Boolean).length + 1;
  const root = '../'.repeat(depth);
  const url = `${site}docs/${p.route}`;
  const isRoot = p.route === '';
  const fullTitle = isRoot ? 'Stalagmight Docs' : `${p.title} — Stalagmight Docs`;
  const chain = ancestors(p, model);
  const section = isRoot ? 'Overview' : (chain[1] || p).title;
  const kids = model.childrenOf(p.route);

  const crumbs = [...chain, p];
  const breadcrumb = crumbs.length > 1 ? `<nav class="docs-crumbs" aria-label="Breadcrumb" data-pagefind-ignore><ol>${crumbs.map((c, i) =>
    i === crumbs.length - 1 ? `<li aria-current="page">${esc(c.title)}</li>`
      : `<li><a href="${relUrl(p.route, c.route)}">${esc(i === 0 ? 'Docs' : c.title)}</a></li>`).join('')}</ol></nav>` : '';

  const since = p.upcoming
    ? `<div class="callout callout-important docs-since"><p class="callout-title">Coming in ${esc(p.upcoming)}</p><p>This describes a feature that is not in the current release${currentVersion ? ` (${esc(currentVersion)})` : ''} yet.</p></div>`
    : p.requires ? `<div class="callout callout-note docs-since"><p class="callout-title">Requires ${esc(p.requires)}</p><p>Available from Stalagmight ${esc(p.requires)}.</p></div>` : '';

  // Sections list what is in them, after their own text if they have any.
  let listing = '';
  if (isRoot) {
    const groups = kids.map(k => {
      const sub = model.childrenOf(k.route);
      return `<section class="docs-group"><h2 id="${esc(k.route.replace(/\/$/, ''))}"><a href="${relUrl(p.route, k.route)}">${esc(k.title)}</a></h2>${k.description && !k.auto ? `<p>${esc(k.description)}</p>` : ''}${sub.length ? cards(sub, p, 'docs-cards') : ''}</section>`;
    });
    listing = groups.length ? `<div class="docs-listing"${p.auto ? '' : ' data-pagefind-ignore'}>${groups.join('')}</div>` : '';
  } else if (kids.length) {
    listing = `<div class="docs-listing"${p.auto ? '' : ' data-pagefind-ignore'}>${p.auto ? '' : '<h2 class="docs-listing-title">In this section</h2>'}${cards(kids, p, 'docs-cards')}</div>`;
  }

  const toc = p.headings.filter(h => h.level === 2 || h.level === 3);
  const tocHtml = toc.length >= 2 ? `<nav class="docs-toc" aria-label="On this page"><p class="docs-toc-title">On this page</p><ul>${toc.map(h =>
    `<li class="docs-toc-${h.level}"><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`).join('')}</ul></nav>` : '<div class="docs-toc" aria-hidden="true"></div>';

  const meta = [];
  if (!p.auto && p.related.length) meta.push(`<section class="docs-related"><h2>Related topics</h2>${cards(p.related, p, 'docs-cards')}</section>`);
  if (p.backlinks.length) meta.push(`<section class="docs-backlinks"><h2>Linked from</h2>${cards(p.backlinks, p, 'docs-links')}</section>`);
  if (p.prev || p.next) {
    meta.push(`<nav class="docs-pager" aria-label="Previous and next">${p.prev ? `<a class="docs-prev" href="${relUrl(p.route, p.prev.route)}"><span>Previous</span>${esc(p.prev.title)}</a>` : '<span></span>'}${p.next ? `<a class="docs-next" href="${relUrl(p.route, p.next.route)}"><span>Next</span>${esc(p.next.title)}</a>` : ''}</nav>`);
  }
  if (!p.auto) {
    meta.push(`<p class="docs-edit">${p.updated ? `Last updated <time datetime="${esc(p.updated)}">${fmtDate(p.updated)}</time> · ` : ''}<a href="${APP_REPO}/edit/master/${SOURCE_IN_REPO}/${esc(p.rel)}" target="_blank" rel="noopener noreferrer">Edit this page on GitHub ↗</a></p>`);
  }

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': p.auto || isRoot ? 'CollectionPage' : 'TechArticle',
        '@id': url + '#page',
        url,
        name: p.title,
        ...(p.auto || isRoot ? {} : { headline: p.title }),
        description: p.description,
        inLanguage: 'en',
        ...(p.updated ? { dateModified: p.updated } : {}),
        isPartOf: { '@id': 'https://stalagmight.com/#site' },
        about: { '@id': 'https://stalagmight.com/#app' },
        publisher: { '@id': 'https://stalagmight.com/#org' },
        ...(crumbs.length > 1 ? { breadcrumb: { '@id': url + '#breadcrumb' } } : {}),
      },
      ...(crumbs.length > 1 ? [{
        '@type': 'BreadcrumbList',
        '@id': url + '#breadcrumb',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: i === 0 ? 'Docs' : c.title, item: `${site}docs/${c.route}` })),
      }] : []),
    ],
  };

  const desc = esc(p.description || 'Documentation for Stalagmight, free and open-source underwater cave survey software.');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#0F0906">
<meta property="og:type" content="${p.auto || isRoot ? 'website' : 'article'}">
<meta property="og:site_name" content="Stalagmight">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="https://stalagmight.com/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="https://stalagmight.com/og-image.png">
<link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
<link rel="alternate icon" href="${root}favicon.ico" sizes="48x48 32x32 16x16">
<link rel="apple-touch-icon" href="${root}apple-touch-icon.png">
<link rel="preload" href="${root}fonts/rajdhani-700-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${root}fonts/barlow-400-latin.woff2" as="font" type="font/woff2" crossorigin>
<script>document.documentElement.className = 'js';</script>
<script type="application/ld+json">
${json(ld)}
</script>
<load src="partials/style-base.html" root="${root}" />
<load src="partials/style-docs.html" />
</head>
<body class="docs-page">
<!-- Generated from ${p.auto ? 'the folder structure' : `${SOURCE_IN_REPO}/${esc(p.rel)}`} in the app repository by build/docs/. Do not edit. -->
<load src="partials/nav.html" root="${root}" />

<div class="docs-shell">
  <aside class="docs-side" id="docs-side">
    <button class="docs-search-btn" type="button" data-root="${root}" aria-haspopup="dialog" aria-controls="docs-search">
      <span>Search docs</span><kbd>/</kbd>
    </button>
    <button class="docs-menu-btn" type="button" aria-expanded="false" aria-controls="docs-tree">Contents</button>
    <nav class="docs-tree" id="docs-tree" aria-label="Documentation">
      <a class="docs-tree-home" href="${relUrl(p.route, '')}"${isRoot ? ' aria-current="page"' : ''}>Overview</a>
      ${tree(model.tree, p)}
    </nav>
  </aside>

  <main class="docs-main"${p.auto ? '' : ` data-pagefind-body data-pagefind-filter="section:${esc(section)}"`}>
    ${breadcrumb}
    <article class="docs-article">
      <h1>${esc(p.title)}</h1>
      ${since}
      ${p.auto ? '' : `<div class="docs-prose">\n${p.html}\n</div>`}
      ${listing}
    </article>
    ${meta.length ? `<footer class="docs-meta" data-pagefind-ignore>\n${meta.join('\n')}\n</footer>` : ''}
  </main>

  ${tocHtml}
</div>

<dialog class="docs-search" id="docs-search" aria-label="Search the documentation">
  <div class="docs-search-head"><p>Search the docs</p><button type="button" class="docs-search-close" aria-label="Close search">Esc</button></div>
  <div id="docs-search-ui"><p class="docs-search-note">Loading search…</p></div>
</dialog>

<load src="partials/footer.html" root="${root}" />
<script type="module" src="${root}js/docs.js"></script>
</body>
</html>
`;
}

// GitHub Pages has no server redirects; an old URL keeps a page that sends
// people and crawlers on, and tells search engines where the content lives now.
export function renderRedirect(from, to, site) {
  const target = `${site}docs/${to}`;
  const rel = relUrl(from, to);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Moved</title>
<link rel="canonical" href="${esc(target)}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${esc(rel)}">
</head>
<body>
<p>This page has moved to <a href="${esc(rel)}">${esc(target)}</a>.</p>
</body>
</html>
`;
}
