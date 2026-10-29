// Main page: label the hero button for the visitor's platform, then point it
// and every row of the download grid at the current release's files. If GitHub
// cannot be reached the markup's own links to the releases page stay, so
// nothing here is required for the page to work.
import {
  RELEASES_URL, OS_NAME, getCurrentRelease, assetsByKey, detectPlatform,
  primaryKey, channel, fmtSize, fmtDate,
} from './releases.js';

// How the hero names the file the button is about to download.
const FILE_KIND = {
  'windows-exe': '.exe installer', 'windows-msi': '.msi', 'macos-dmg': '.dmg',
  'linux-appimage': 'AppImage', 'linux-deb': '.deb', 'linux-rpm': '.rpm',
};

const platform = detectPlatform();
const button = document.getElementById('heroDownload');
const label = document.getElementById('heroDownloadLabel');
const heroMeta = document.getElementById('heroMeta');
const dlMeta = document.getElementById('dlMeta');

if (platform) {
  label.textContent = 'Download for ' + OS_NAME[platform.os];
  document.querySelector(`.dl-card[data-os="${platform.os}"]`)?.classList.add('is-yours');
} else {
  // A phone, tablet or ChromeOS can't run any of the files, so rather than
  // guess, the button shows them all.
  button.href = '#download';
}

function line(parent, parts) {
  parent.replaceChildren(...parts.map(p => {
    if (p instanceof Node) return p;
    const span = document.createElement('span');
    span.textContent = p;
    return span;
  }));
}

function tagSpan(release) {
  const s = document.createElement('span');
  s.className = 'ver';
  s.textContent = release.tag;
  return s;
}

getCurrentRelease().then(release => {
  if (!release) return;
  const files = assetsByKey(release.assets);

  for (const row of document.querySelectorAll('[data-asset]')) {
    const asset = files[row.dataset.asset];
    if (!asset) { row.closest('li').hidden = true; continue; }
    row.href = asset.url;
    row.querySelector('.dl-size').textContent = fmtSize(asset.size);
  }
  // A platform this release has no files for says so, instead of an empty list.
  for (const card of document.querySelectorAll('.dl-card')) {
    if (card.querySelector('.dl-files li:not([hidden])')) continue;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'dl-missing';
    a.href = RELEASES_URL;
    a.textContent = `No build in ${release.tag} — see all releases`;
    li.append(a);
    card.querySelector('.dl-files').append(li);
  }

  const key = primaryKey(platform, files);
  const what = [tagSpan(release), channel(release)];
  if (key) {
    button.href = files[key].url;
    line(heroMeta, [...what, FILE_KIND[key], fmtSize(files[key].size)]);
    if (platform.os === 'macos') {
      const intel = document.createElement('span');
      intel.className = 'hero-meta-warn';
      intel.textContent = 'Apple Silicon only · Intel Macs not supported';
      heroMeta.append(intel);
    }
  } else {
    // Either no platform was detected, or this release has nothing for it; the
    // grid says which, so that is where the button goes.
    button.href = '#download';
    line(heroMeta, [...what, 'Windows', 'macOS', 'Linux']);
  }

  const parts = [tagSpan(release), channel(release), 'Released ' + fmtDate(release.date)];
  if (files.checksums) {
    const sums = document.createElement('a');
    sums.href = files.checksums.url;
    sums.textContent = 'SHA256SUMS';
    parts.push(sums);
  }
  line(dlMeta, [...parts, 'AGPL-3.0']);
}).catch(() => {});

// Copy buttons for the shell commands. Without the clipboard API (an insecure
// origin, an old browser) the text is selected instead, ready for Ctrl+C.
for (const btn of document.querySelectorAll('[data-copy]')) {
  btn.addEventListener('click', async () => {
    const el = document.querySelector(btn.dataset.copy);
    try {
      await navigator.clipboard.writeText(el.textContent);
      btn.textContent = 'Copied';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(el);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      btn.textContent = 'Selected';
    }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
  });
}
