// Release data at build time: the same GitHub API calls the browser makes in
// src/js/releases.js, through the same grouping, so the markup the build writes
// is the markup the browser would draw. Fetched once per build and shared by
// the snapshot and the sitemap.
import { groupVersions } from '../src/js/releases.js';

const API = 'https://api.github.com/repos/Stalagmight/Stalagmight';

// Unauthenticated calls get 60 an hour per IP, which a shared CI runner can
// exhaust on its own; the workflow passes its token for 1000 an hour.
function headers(html) {
  const h = {
    Accept: html ? 'application/vnd.github.html+json' : 'application/vnd.github+json',
    'User-Agent': 'stalagmight-website-build',
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function request(url, html = false) {
  const res = await fetch(url, { headers: headers(html), signal: AbortSignal.timeout(20000) });
  if (res.status === 404) return { data: null, next: null };
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
  const next = /<([^>]+)>;\s*rel="next"/.exec(res.headers.get('Link') || '');
  return { data: await res.json(), next: next && next[1] };
}

async function load() {
  const all = [];
  let url = `${API}/releases?per_page=100`;
  for (let page = 0; url && page < 10; page++) {
    const { data, next } = await request(url, true);
    all.push(...(data || []).filter(r => !r.draft));
    url = next;
  }
  // The release the main page offers, chosen as js/releases.js chooses it:
  // GitHub's "latest" (newest stable, or whichever is flagged), else the newest.
  const latest = (await request(`${API}/releases/latest`)).data;
  const current = latest || [...all].sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))[0] || null;
  return {
    versions: groupVersions(all),
    current: current && {
      version: current.tag_name.replace(/^v/i, ''),
      date: current.published_at,
    },
  };
}

// In CI a failed fetch fails the build, so the deploy that is already live, with
// its own snapshot, stays up rather than being replaced by a page without one.
// Locally it only warns: the site still works, it just falls back to the
// browser fetching everything, as it did before there was a snapshot.
let pending = null;
let loadedAt = 0;
const DEV_TTL = 15 * 60 * 1000;

export function releaseData() {
  if (pending && Date.now() - loadedAt < DEV_TTL) return pending;
  loadedAt = Date.now();
  pending = load().catch(err => {
    if (process.env.CI) throw err;
    console.warn(`\n[releases] ${err.message}. Building without the releases snapshot.`);
    pending = null;
    return null;
  });
  return pending;
}
