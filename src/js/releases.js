// Release data for the download links and the changelog, read straight from
// GitHub in the browser. Nothing is baked in at build time, so a new release
// shows up here as soon as GitHub publishes it (give or take the cache below)
// without the site being rebuilt. See docs/downloads.md.

const REPO = 'Stalagmight/Stalagmight';
const API = `https://api.github.com/repos/${REPO}`;
export const RELEASES_URL = `https://github.com/${REPO}/releases`;

// Unauthenticated API calls are limited to 60 an hour per IP, so every answer
// is kept for a while. Long enough that reading a few pages costs one request,
// short enough that a release is on the site within minutes.
const TTL = 15 * 60 * 1000;
const PREFIX = 'stalagmight:gh:v1:';

// Storage can be missing or throw (private windows, blocked site data), and a
// cache miss just means asking GitHub again, so every access is guarded.
async function cached(key, produce) {
  let hit = null;
  try { hit = JSON.parse(localStorage.getItem(PREFIX + key)); } catch {}
  const usable = hit && typeof hit === 'object' && 'v' in hit;
  if (usable && Date.now() - hit.t < TTL) return hit.v;
  try {
    const v = await produce();
    try { localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v })); } catch {}
    return v;
  } catch (err) {
    // Rate-limited or offline: an old answer beats none.
    if (usable) return hit.v;
    throw err;
  }
}

// null for a 404, which is an answer here rather than a failure: it is what
// /releases/latest says while every release is still a pre-release.
async function request(url, { html = false } = {}) {
  // Accept is a CORS-safelisted header, so neither variant costs a preflight.
  const res = await fetch(url, {
    headers: { Accept: html ? 'application/vnd.github.html+json' : 'application/vnd.github+json' },
  });
  if (res.status === 404) return { data: null, next: null };
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
  const next = /<([^>]+)>;\s*rel="next"/.exec(res.headers.get('Link') || '');
  return { data: await res.json(), next: next && next[1] };
}

// Only what the pages use, so the cache stays small.
function trim(r) {
  return {
    tag: r.tag_name,
    name: r.name || r.tag_name,
    prerelease: !!r.prerelease,
    date: r.published_at || r.created_at,
    url: r.html_url,
    assets: (r.assets || []).map(a => ({ name: a.name, size: a.size, url: a.browser_download_url })),
  };
}

// The release the main page offers: the newest stable one, or while there is
// none, the newest pre-release. GitHub's own "latest" already means the first
// half, and respects whichever release the maintainers marked as latest.
export function getCurrentRelease() {
  return cached('current', async () => {
    const latest = (await request(`${API}/releases/latest`)).data;
    if (latest) return trim(latest);
    const [newest] = (await request(`${API}/releases?per_page=1`)).data || [];
    return newest ? trim(newest) : null;
  });
}

// Every release, one entry per version. The notes of a release candidate are
// the notes for the version it is a candidate for, repeated in full by each
// one, so a version keeps a single copy: the stable release's when there is
// one, otherwise the newest candidate's.
export function getVersions() {
  return cached('versions', async () => {
    const all = [];
    let url = `${API}/releases?per_page=100`;
    for (let page = 0; url && page < 10; page++) {
      const { data, next } = await request(url, { html: true });
      all.push(...(data || []).filter(r => !r.draft));
      url = next;
    }
    return groupVersions(all);
  });
}

export function groupVersions(releases) {
  const byVersion = new Map();
  for (const r of releases) {
    const v = versionOf(r.tag_name);
    if (!byVersion.has(v)) byVersion.set(v, []);
    byVersion.get(v).push(r);
  }
  return [...byVersion].map(([version, rs]) => {
    rs.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
    const lead = rs.find(r => !r.prerelease) || rs[0];
    return {
      version,
      stable: !lead.prerelease,
      tag: lead.tag_name,
      date: lead.published_at,
      url: lead.html_url,
      notes: lead.body_html || '',
      builds: rs.map(trim),
    };
  }).sort((a, b) => compareVersions(b.version, a.version));
}

// "v0.5.0-rc5" -> "0.5.0"
export function versionOf(tag) {
  return tag.replace(/^v/i, '').split(/[-+]/)[0];
}

export function compareVersions(a, b) {
  const x = a.split('.').map(n => parseInt(n, 10) || 0);
  const y = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d;
  }
  return 0;
}

export function channel(release) {
  if (!release.prerelease) return 'Stable';
  if (/-rc/i.test(release.tag)) return 'Release candidate';
  if (/beta/i.test(release.tag)) return 'Beta';
  if (/alpha/i.test(release.tag)) return 'Alpha';
  return 'Pre-release';
}

// What a release asset is, from its file name alone. Names carry the version
// (Stalagmight_0.5.0_amd64.deb), so only the suffix is trusted. The key is what
// the page's [data-asset] slots ask for; an unknown file still shows up on the
// releases page, under "Other files".
export function classifyAsset(name) {
  const n = name.toLowerCase();
  if (/sha256sums/.test(n)) return { key: 'checksums', os: 'checksums' };
  if (n.endsWith('.exe')) return { key: 'windows-exe', os: 'windows' };
  if (n.endsWith('.msi')) return { key: 'windows-msi', os: 'windows' };
  if (n.endsWith('.dmg')) {
    // An Intel build would get its own key; the site only promises Apple Silicon.
    const intel = /(x64|x86_64|amd64|intel)/.test(n) && !/(aarch64|arm64|universal)/.test(n);
    return { key: intel ? 'macos-dmg-x64' : 'macos-dmg', os: 'macos' };
  }
  if (n.endsWith('.appimage')) return { key: 'linux-appimage', os: 'linux' };
  if (n.endsWith('.deb')) return { key: 'linux-deb', os: 'linux' };
  if (n.endsWith('.rpm')) return { key: 'linux-rpm', os: 'linux' };
  return { key: 'other', os: 'other' };
}

// { 'windows-exe': asset, ... }, the first of each kind.
export function assetsByKey(assets) {
  const out = {};
  for (const a of assets) {
    const { key } = classifyAsset(a.name);
    if (key !== 'other' && !out[key]) out[key] = a;
  }
  return out;
}

// The visitor's desktop OS, or null for anything this cannot run on (phones,
// tablets, ChromeOS) or does not recognise. Linux also reports the package
// format when the user agent names the distro, which some browsers do
// ("X11; Ubuntu; Linux x86_64", "X11; Fedora; ...").
export function detectPlatform(nav = navigator) {
  const ua = (nav.userAgent || '').toLowerCase();
  const plat = ((nav.userAgentData && nav.userAgentData.platform) || nav.platform || '').toLowerCase();
  const hay = plat + ' ' + ua;
  if (/android|iphone|ipad|ipod|cros|chrome os/.test(hay)) return null;
  if (/mac|darwin/.test(hay)) {
    // iPadOS asks for desktop pages as a Mac; only the touch screen gives it away.
    return nav.maxTouchPoints > 1 ? null : { os: 'macos' };
  }
  if (/win/.test(hay)) return { os: 'windows' };
  if (/linux|x11|ubuntu|fedora|debian/.test(hay)) {
    const pkg = /ubuntu|debian|mint/.test(ua) ? 'deb'
      : /fedora|red hat|rhel|centos|suse/.test(ua) ? 'rpm' : null;
    return { os: 'linux', pkg };
  }
  return null;
}

// Which of a release's files suits the visitor best, as an assetsByKey key.
export function primaryKey(platform, byKey) {
  if (!platform) return null;
  const prefs = {
    windows: ['windows-exe', 'windows-msi'],
    macos: ['macos-dmg'],
    linux: platform.pkg === 'deb' ? ['linux-deb', 'linux-appimage', 'linux-rpm']
      : platform.pkg === 'rpm' ? ['linux-rpm', 'linux-appimage', 'linux-deb']
      : ['linux-appimage', 'linux-deb', 'linux-rpm'],
  }[platform.os];
  return prefs.find(k => byKey[k]) || null;
}

export const OS_NAME = { windows: 'Windows', macos: 'macOS', linux: 'Linux' };

export function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

// UTC, so a release dated just after midnight reads the same day everywhere.
export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
