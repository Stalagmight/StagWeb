// Docs pages: the contents toggle on small screens, and search.
//
// Search is Pagefind (https://pagefind.app): the build indexes the finished
// pages into /pagefind/, and its UI is loaded the first time someone opens
// the search box, so a page that never searches never pays for it.

const side = document.getElementById('docs-side');
const menu = document.querySelector('.docs-menu-btn');
menu?.addEventListener('click', () => {
  const open = side.classList.toggle('is-open');
  menu.setAttribute('aria-expanded', String(open));
});

const button = document.querySelector('.docs-search-btn');
const dialog = document.getElementById('docs-search');
const mount = document.getElementById('docs-search-ui');
const root = button?.dataset.root || './';
let loading = null;

function load() {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${root}pagefind/pagefind-ui.css`;
    document.head.append(css);
    const js = document.createElement('script');
    js.src = `${root}pagefind/pagefind-ui.js`;
    js.onload = resolve;
    js.onerror = reject;
    document.head.append(js);
  }).then(() => {
    mount.replaceChildren();
    // eslint-disable-next-line no-undef
    new PagefindUI({
      element: mount,
      bundlePath: `${root}pagefind/`,
      showSubResults: true,
      showImages: false,
      autofocus: true,
      translations: { placeholder: 'Search the docs' },
    });
  }).catch(() => {
    loading = null;
    mount.innerHTML = '<p class="docs-search-note">Search is not available here. It is built with the site (<code>npm run build</code>), not by the dev server.</p>';
  });
  return loading;
}

function open() {
  if (!dialog.open) dialog.showModal();
  load().then(() => mount.querySelector('input')?.focus());
}

button?.addEventListener('click', open);
dialog?.querySelector('.docs-search-close')?.addEventListener('click', () => dialog.close());
// A click on the backdrop lands on the dialog itself, outside its content.
dialog?.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

document.addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
    e.preventDefault();
    open();
  }
});

// Click (or Enter) on a screenshot opens it at full size. The build gives each
// one a srcset whose widest entry is the image at its own resolution
// (build/docs/images.js), which is what the enlarged view shows.
const zoom = document.createElement('dialog');
zoom.className = 'docs-zoom';
zoom.setAttribute('aria-label', 'Enlarged image');
zoom.innerHTML = '<img alt=""><button type="button" class="docs-zoom-close" aria-label="Close">Esc</button>';
const zoomImg = zoom.querySelector('img');

function largest(img) {
  const best = (img.getAttribute('srcset') || '').split(',')
    .map(s => s.trim().split(/\s+/))
    .filter(([u, w]) => u && /w$/.test(w || ''))
    .sort((a, b) => parseInt(b[1], 10) - parseInt(a[1], 10))[0];
  return best ? best[0] : img.currentSrc || img.src;
}

function enlarge(img) {
  if (!zoom.isConnected) document.body.append(zoom);
  zoomImg.src = largest(img);
  zoomImg.alt = img.alt;
  zoom.showModal();
}

for (const img of document.querySelectorAll('.docs-prose img')) {
  if (img.closest('a')) continue;
  img.classList.add('is-zoomable');
  img.tabIndex = 0;
  img.setAttribute('role', 'button');
  img.setAttribute('aria-label', `Enlarge: ${img.alt}`);
  img.addEventListener('click', () => enlarge(img));
  img.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enlarge(img); }
  });
}
zoom.addEventListener('click', () => zoom.close());
