// Releases page: every version, newest first, with its builds and notes.
//
// The build has usually written the list into the HTML already (see
// build/releases-snapshot.js), stamped with a fingerprint of the data it came
// from. This still asks GitHub, and redraws only if the answer differs, so a
// release published since the last build appears without a rebuild.
import { RELEASES_URL, getVersions } from './releases.js';
import { renderVersions, fingerprint } from './changelog-render.js';

const list = document.getElementById('releases');
const snapshot = list.dataset.snapshot || '';

const env = { doc: document, parse: html => new DOMParser().parseFromString(html, 'text/html') };

function external(href, text) {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = text;
  return a;
}

// Content that arrives after load misses the browser's own jump to #v0.5.0,
// and a target folded inside a closed <details> is never shown. Redo the jump,
// opening whatever the target sits in.
function revealHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  const target = id && document.getElementById(id);
  if (!target) return;
  for (let n = target; n; n = n.parentElement) if (n.tagName === 'DETAILS') n.open = true;
  target.scrollIntoView();
}

function status(...children) {
  const p = document.createElement('p');
  p.className = 'rel-status';
  p.append(...children);
  list.replaceChildren(p);
}

if (snapshot) revealHash();

getVersions().then(versions => {
  if (!versions.length) {
    status('No releases yet. Watch ', external(RELEASES_URL, 'the repository'), ' to hear about the first one.');
    return;
  }
  if (fingerprint(versions) === snapshot) return;
  list.replaceChildren(...renderVersions(versions, env));
  revealHash();
}).catch(() => {
  // The build's copy is at worst a few hours old, which beats an error.
  if (snapshot) return;
  status('The list could not be loaded from GitHub just now. Every release is also on ',
    external(RELEASES_URL, 'GitHub ↗'), '.');
});
window.addEventListener('hashchange', revealHash);
