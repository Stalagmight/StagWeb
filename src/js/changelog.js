// Releases page: every version, newest first, with its builds and notes.
import { RELEASES_URL, OS_NAME, getVersions, classifyAsset, channel, fmtSize, fmtDate } from './releases.js';

const list = document.getElementById('releases');

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
  el.append(...children.filter(c => c != null && c !== false));
  return el;
}

const external = (href, text) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text);

// GitHub sanitises body_html before serving it; this is a second, cheap pass
// so nothing executable reaches the page even if that ever slipped.
function notesFragment(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, frame, object, embed, form, link, meta, base').forEach(n => n.remove());
  for (const el of doc.body.querySelectorAll('*')) {
    for (const { name, value } of [...el.attributes]) {
      if (name.startsWith('on') || (/^(href|src|action|formaction|xlink:href)$/i.test(name) && /^\s*(javascript|vbscript|data):/i.test(value))) {
        el.removeAttribute(name);
      }
    }
    if (el.tagName === 'A' && /^https?:/i.test(el.getAttribute('href') || '')) {
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    }
    if (el.tagName === 'IMG') el.loading = 'lazy';
  }
  // GitHub turns every newline of a release body into a <br>, and these notes
  // are prose hard-wrapped at 80 columns, so the breaks go and the text reflows
  // to the column instead of leaving ragged half-lines.
  for (const br of doc.body.querySelectorAll('br')) {
    const next = br.nextSibling;
    if (next && next.nodeType === Node.TEXT_NODE && next.data.startsWith('\n')) br.remove();
  }
  const frag = document.createDocumentFragment();
  frag.append(...doc.body.childNodes);
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

  const el = h('details', { class: 'rel-build', ...(id ? { id } : {}) },
    h('summary', {},
      h('span', { class: 'ver' }, b.tag),
      h('span', { class: 'rel-ch' }, channel(b)),
      h('time', { datetime: b.date }, fmtDate(b.date))),
    groups.length ? h('div', { class: 'rel-files' }, ...groups) : h('p', { class: 'rel-none' }, 'No files attached.'),
    h('a', { class: 'rel-gh', href: b.url, target: '_blank', rel: 'noopener noreferrer' }, 'This build on GitHub ↗'));
  el.open = open;
  return el;
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

// The page is built after load, so the browser's own jump to #v0.5.0 found
// nothing to jump to. Redo it, opening whatever the target is folded inside.
function revealHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  const target = id && document.getElementById(id);
  if (!target) return;
  for (let n = target; n; n = n.parentElement) if (n.tagName === 'DETAILS') n.open = true;
  target.scrollIntoView();
}

function status(...children) {
  list.replaceChildren(h('p', { class: 'rel-status' }, ...children));
}

getVersions().then(versions => {
  if (!versions.length) {
    status('No releases yet. Watch ', external(RELEASES_URL, 'the repository'), ' to hear about the first one.');
    return;
  }
  list.replaceChildren(...versions.map((v, i) => version(v, i === 0)));
  revealHash();
}).catch(() => {
  status('The list could not be loaded from GitHub just now. Every release is also on ',
    external(RELEASES_URL, 'GitHub ↗'), '.');
});
window.addEventListener('hashchange', revealHash);
