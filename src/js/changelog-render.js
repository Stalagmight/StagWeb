// The releases page's markup, built from getVersions() data. It runs in two
// places: in the browser (js/changelog.js) and at build time under linkedom
// (build/releases-snapshot.js), which writes the same markup into the HTML so
// crawlers that never run JavaScript still see every release. So everything
// here goes through the `doc` and `parse` it is handed, and sets attributes
// rather than DOM properties, which a server-side DOM may not implement.
import { OS_NAME, classifyAsset, channel, fmtSize, fmtDate } from './releases.js';

const TEXT_NODE = 3;

// FNV-1a over the data the markup is drawn from. The build stamps it on the
// list; the browser compares it with what GitHub says now, and leaves the
// built markup alone when nothing changed, so what the reader has opened stays
// open.
export function fingerprint(versions) {
  const s = JSON.stringify(versions);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function renderVersions(versions, { doc, parse }) {
  function h(tag, attrs, ...children) {
    const el = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    el.append(...children.filter(c => c != null && c !== false));
    return el;
  }

  // GitHub sanitises body_html before serving it; this is a second, cheap pass
  // so nothing executable reaches the page even if that ever slipped. Wrapped
  // in a whole document because linkedom, unlike a browser, does not put a bare
  // fragment into <body>.
  function notesFragment(html) {
    const parsed = parse(`<!doctype html><html><head></head><body>${html}</body></html>`);
    parsed.querySelectorAll('script, style, iframe, frame, object, embed, form, link, meta, base').forEach(n => n.remove());
    for (const el of parsed.body.querySelectorAll('*')) {
      for (const { name, value } of [...el.attributes]) {
        if (name.startsWith('on') || (/^(href|src|action|formaction|xlink:href)$/i.test(name) && /^\s*(javascript|vbscript|data):/i.test(value))) {
          el.removeAttribute(name);
        }
      }
      if (el.tagName === 'A' && /^https?:/i.test(el.getAttribute('href') || '')) {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
      if (el.tagName === 'IMG') el.setAttribute('loading', 'lazy');
    }
    // GitHub turns every newline of a release body into a <br>, and these notes
    // are prose hard-wrapped at 80 columns, so the breaks go and the text reflows
    // to the column instead of leaving ragged half-lines.
    for (const br of parsed.body.querySelectorAll('br')) {
      const next = br.nextSibling;
      if (next && next.nodeType === TEXT_NODE && next.data.startsWith('\n')) br.remove();
    }
    const frag = doc.createDocumentFragment();
    frag.append(...parsed.body.childNodes);
    return frag;
  }

  const GROUPS = ['windows', 'macos', 'linux', 'checksums', 'other'];
  // Within a platform, files in the order the main page's grid lists them.
  const ORDER = ['windows-exe', 'windows-msi', 'macos-dmg', 'macos-dmg-x64', 'linux-appimage', 'linux-deb', 'linux-rpm'];
  const rank = a => { const i = ORDER.indexOf(classifyAsset(a.name).key); return i < 0 ? ORDER.length : i; };
  const GROUP_NAME = { ...OS_NAME, checksums: 'Checksums', other: 'Other files' };

  function build(b, { open, id }) {
    const byGroup = Object.fromEntries(GROUPS.map(g => [g, []]));
    for (const a of [...b.assets].sort((x, y) => rank(x) - rank(y))) byGroup[classifyAsset(a.name).os].push(a);

    // Said here too, since a .dmg name alone doesn't tell an Intel Mac owner much.
    const appleSilicon = byGroup.macos.every(a => classifyAsset(a.name).key === 'macos-dmg');
    const groups = GROUPS.filter(g => byGroup[g].length).map(g => h('div', { class: 'rel-os' },
      h('h4', {}, g === 'macos' && appleSilicon ? 'macOS · Apple Silicon only' : GROUP_NAME[g]),
      h('ul', {}, ...byGroup[g].map(a => h('li', {},
        h('a', { class: 'rel-file', href: a.url },
          h('span', { class: 'rel-fname' }, a.name),
          h('span', { class: 'rel-lead' }),
          h('span', { class: 'rel-fsize' }, fmtSize(a.size))))))));

    return h('details', { class: 'rel-build', ...(id ? { id } : {}), ...(open ? { open: '' } : {}) },
      h('summary', {},
        h('span', { class: 'ver' }, b.tag),
        h('span', { class: 'rel-ch' }, channel(b)),
        h('time', { datetime: b.date }, fmtDate(b.date))),
      groups.length ? h('div', { class: 'rel-files' }, ...groups) : h('p', { class: 'rel-none' }, 'No files attached.'),
      h('a', { class: 'rel-gh', href: b.url, target: '_blank', rel: 'noopener noreferrer' }, 'This build on GitHub ↗'));
  }

  function version(v, newest) {
    const lead = v.builds.find(b => b.tag === v.tag) || v.builds[0];
    const anchor = 'v' + v.version;
    const notes = v.notes && h('div', { class: 'rel-notes' }, notesFragment(v.notes));
    // The newest version's notes are the page; older ones fold away.
    const notesPart = !notes ? []
      : newest ? [h('h3', { class: 'rel-sub' }, 'Release notes'), notes]
      : [h('details', { class: 'rel-more' }, h('summary', {}, 'Release notes'), notes)];

    return h('article', { class: 'rel-version', id: anchor },
      h('header', { class: 'rel-vhead' },
        h('h2', {}, h('a', { href: '#' + anchor }, v.version)),
        h('span', { class: 'rel-badge' + (v.stable ? ' is-stable' : '') }, channel(lead)),
        h('time', { datetime: v.date }, fmtDate(v.date))),
      h('h3', { class: 'rel-sub' }, 'Downloads'),
      // Each build is linkable by its tag, except the one that shares the
      // version's own anchor (a stable release tagged exactly "v" + version).
      h('div', { class: 'rel-builds' }, ...v.builds.map((b, i) =>
        build(b, { open: newest && i === 0, id: b.tag !== anchor && b.tag }))),
      ...notesPart);
  }

  return versions.map((v, i) => version(v, i === 0));
}
