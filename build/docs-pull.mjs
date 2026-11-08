// Keeps .app/ a current copy of the app repository's user guide, so a local
// `npm run build` (which is also the VPN deploy) includes the docs. Runs as
// npm's prebuild step.
//
// It is a sparse, blob-less clone: only docs/user-guide/ is checked out, and
// the history comes without old file contents, which is all the build needs
// to date each page by its last commit.
//
// Skipped in CI, where the workflow checks the repository out itself, and when
// DOCS_SOURCE points somewhere else. Never fails the build: without network
// the existing copy (or no docs) is used.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const DIR = '.app';
const REPO = 'https://github.com/Stalagmight/Stalagmight.git';

if (process.env.CI || process.env.DOCS_SOURCE) process.exit(0);

const git = (...args) => execFileSync('git', args, { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });

try {
  if (!fs.existsSync(`${DIR}/.git`)) {
    console.log(`[docs] cloning the user guide from ${REPO} into ${DIR}/`);
    git('clone', '--quiet', '--filter=blob:none', '--sparse', REPO, DIR);
    git('-C', DIR, 'sparse-checkout', 'set', 'docs/user-guide');
  } else {
    git('-C', DIR, 'pull', '--quiet', '--ff-only');
  }
} catch (err) {
  console.warn(`[docs] could not update ${DIR}/ (${(err.stderr || err.message).trim().split('\n').pop()}); building with what is there`);
}
