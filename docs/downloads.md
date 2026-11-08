# Downloads and the releases page

Every download link on the site points straight at a file attached to a GitHub
release of [`Stalagmight/Stalagmight`](https://github.com/Stalagmight/Stalagmight/releases).
The browser asks the GitHub API, so a new release appears on the site within
minutes of being published, with no rebuild and no change to this repository.
The build also reads GitHub, to write the `/releases/` list into the HTML for
crawlers (see [the build-time snapshot](#the-build-time-snapshot)), but nothing
about a release is ever written into the source.

| Where | Script | What it shows |
|---|---|---|
| Hero button | `src/js/download.js` | The file for the visitor's OS, with version, channel, format and size |
| `#download` grid | `src/js/download.js` | Every file of the current release by platform, sizes, SHA256SUMS |
| `/releases/` | `build/releases-snapshot.js`, then `src/js/changelog.js` | Every version: its builds' files and its notes |
| Home page JSON-LD | `build/releases-snapshot.js` | `softwareVersion` and `dateModified` of the current release |

The browser scripts share `src/js/releases.js`: fetching, caching, asset
classification and platform detection. The releases markup itself is in
`src/js/changelog-render.js`, shared by the browser and the build.

## Which release the main page offers

The newest **stable** release; while none exists, the newest **pre-release**,
labelled as such (today: `v0.5.0-rc5`, "Release candidate").

That is GitHub's `GET /releases/latest`, which only ever returns a non-prerelease
and honours the "Set as latest release" flag, with a fallback to
`GET /releases?per_page=1` on its 404. Once a stable release exists, a later
`0.6.0-rc1` does **not** replace it on the main page; it appears only on
`/releases/`.

While every release is a pre-release, the `/releases/latest` 404 shows up as a red
line in the browser console. It is expected, not an error.

## Caching and rate limits

Unauthenticated GitHub API calls are limited to **60 per hour per IP**. Each
answer is cached in `localStorage` for 15 minutes under keys prefixed
`stalagmight:gh:v1:`, so browsing the site costs a visitor 1–2 requests per
quarter hour (main page) plus 1 (releases page).

- Fetch fails or is rate-limited, with a stale cache: the stale answer is used.
- Fails with no cache: the markup's own links stay. Every download row and the
  hero button link to the GitHub releases page. The releases page keeps the
  build's list; only a page built without one shows a message linking there.
- No JavaScript: the same static links on the main page; the releases page shows
  the build's list (or, built without one, a `<noscript>` link).
- `localStorage` unavailable (private mode, blocked site data): it fetches every
  time and works otherwise.

To force a refresh while testing, clear the `stalagmight:gh:v1:*` keys in
devtools.

## The asset-naming contract

Files are recognised by **suffix only**, because names carry the version
(`Stalagmight_0.5.0_amd64.deb`). `classifyAsset()` in `releases.js`:

| Suffix | Key | Shown as |
|---|---|---|
| `.exe` | `windows-exe` | Windows → Installer (the hero's Windows pick) |
| `.msi` | `windows-msi` | Windows → MSI package |
| `.dmg` with `aarch64`/`arm64`/`universal` or no arch | `macos-dmg` | macOS → Disk image |
| `.dmg` with `x64`/`x86_64`/`amd64`/`intel` | `macos-dmg-x64` | releases page only |
| `.AppImage` | `linux-appimage` | Linux → AppImage (the hero's default Linux pick) |
| `.deb` | `linux-deb` | Linux → Debian / Ubuntu |
| `.rpm` | `linux-rpm` | Linux → Fedora / openSUSE |
| contains `sha256sums` | `checksums` | SHA256SUMS link |
| anything else | `other` | releases page, "Other files" |

The grid's rows are static markup in `src/partials/cta.html`, keyed by
`data-asset="<key>"`. A row whose file is missing from the current release is
hidden, and a platform with no files at all says so and links to the releases
page.

**If the release pipeline changes**, update in this order:

- **Renamed files:** keep the suffixes above and nothing breaks.
- **New file type** (e.g. an `.app.tar.gz`): add a branch in `classifyAsset()`.
  If it belongs on the main page, also add a `data-asset` row in `cta.html`.
- **An Intel or universal Mac build:** the macOS card copy ("Apple Silicon
  only, Intel Macs are not supported"), the hero's macOS warning in
  `download.js`, and the "Apple Silicon only" group heading in
  `changelog.js` all need revisiting.
- **Another architecture**, such as Linux ARM: the per-card arch lines in
  `cta.html` ("64-bit", "Apple Silicon", "x86-64") are static.

## Which file the hero picks

`detectPlatform()` reads the user agent (and `userAgentData.platform` where the
browser provides it). `primaryKey()` maps the result to a file:

- **Windows:** `.exe`, else `.msi`.
- **macOS:** `.dmg`. The meta line under the button adds "Apple Silicon only ·
  Intel Macs not supported".
- **Linux:** `.deb` when the UA names Ubuntu, Debian or Mint; `.rpm` for Fedora,
  Red Hat, CentOS or SUSE; otherwise the AppImage. Firefox on Ubuntu and Fedora
  names the distro. Chrome never does.
- **Phones, tablets (including iPadOS posing as a Mac), ChromeOS, unknown:** the
  button reads "Download for Desktop" and scrolls to the grid.

If the release has no file for the detected platform, the button also goes to
the grid, which says so.

## The releases page

One entry per **version** (`v0.5.0-rc5` → `0.5.0`), newest version first:

- **Notes, once:** each release candidate's body repeats the full notes for its
  version, so the page shows the stable release's notes if there is one, else the
  newest candidate's. They come from the API's `body_html` (GitHub's own
  rendering, sanitised by GitHub). `changelog.js` runs a second, cheap pass that
  drops script-like elements and `on*` attributes. It also removes the `<br>`
  GitHub inserts for every newline, because the notes are hard-wrapped prose.
- **Builds:** one folding row per tag, newest first. Only the newest version's
  newest build starts open.
- **Folding:** the newest version's notes are open; older ones fold.
- **Anchors:** `#v0.5.0` links a version and `#v0.5.0-rc3` a build. The page
  opens whatever the target is folded inside, since the content arrives after
  the browser's own jump.

Drafts never appear: the unauthenticated API doesn't return them.

## The build-time snapshot

Crawlers that do not run JavaScript (GPTBot, ClaudeBot, PerplexityBot, most of
the AI crawlers) used to see only "Loading releases…" on `/releases/`. So the
build now writes the list into the HTML, and the browser keeps it current.

**At build time,** `build/releases-snapshot.js` (a Vite `transformIndexHtml`
hook) gets the releases through `build/releases-data.js`, which makes the same
API calls as the browser and groups them with the same `groupVersions()`. It
renders them with `renderVersions()` from `src/js/changelog-render.js` under
[linkedom](https://github.com/WebReflection/linkedom), a DOM for Node. It
replaces the contents of `#releases`, including the loading and `<noscript>`
placeholders, and stamps the list with `data-snapshot="<fingerprint>"`, an
FNV-1a hash of the version data.

**In the browser,** `changelog.js` still asks GitHub. If the fingerprint of the
answer matches the stamp, it leaves the markup alone, so anything the reader has
opened stays open. Otherwise it redraws. If GitHub cannot be reached, the build's
list stays.

Verified in headless Chrome against the built page: with a matching stamp
GitHub answered 200 and nothing was redrawn; with a wrong stamp the list was
redrawn into markup with the same text and the same tags and attributes as the
build's.

**When GitHub cannot be reached at build time:**

- **In CI** the build fails, and the deploy already live keeps its snapshot.
- **Locally** it warns and builds without a snapshot. The page then behaves as it
  did before there was one: the browser fetches everything.

**How fresh it is.** Pages rebuilds every six hours ([github-pages.md](github-pages.md)),
so crawlers see a new release within six hours; visitors see it within minutes
through the browser refresh. The VPN copy's snapshot dates from its last local
`npm run build`. That copy is not reachable by crawlers anyway.

The same hook also writes `softwareVersion` and `dateModified` into the home
page's `SoftwareApplication` JSON-LD, for the release the main page offers
(GitHub's "latest", else the newest).

**Editing the markup:** `changelog-render.js` runs under linkedom as well as in
browsers. Create elements with the `doc` it is handed, parse with `parse`, set
attributes rather than properties (`setAttribute('open', '')`, not `.open =
true`), and use `nodeType === 3` instead of the browser-only `Node` global.
