# The user guide on the website

The user guide is written in the **app repository**, as Markdown in
[`docs/user-guide/`](https://github.com/Stalagmight/Stalagmight/tree/master/docs/user-guide),
and published here at **`/docs/`**. Authors never touch this repository: the
authoring rules are in that folder's `README.md`.

```
Stalagmight/Stalagmight                      this repository
docs/user-guide/                             build/docs/  (a Vite plugin)
  index.md              ─┐                     reads the Markdown, checks every link,
  import/index.md        │  CI: checkout        computes backlinks and related pages,
  import/mnemo-dmp.md    ├─ local: .app/ ──►    writes the pages into src/docs/ (ignored)
  images/…               │  (prebuild)        Vite builds them like any other page
  README.md (not published)                   Pagefind indexes dist/ for search
                                               → /docs/, /docs/import/mnemo-dmp/, …
```

## Conventions

| In `docs/user-guide/` | On the site |
|---|---|
| `import/mnemo-dmp.md` | `/docs/import/mnemo-dmp/` |
| `import/index.md` | `/docs/import/` (the section's page, followed by a list of its pages unless it already links to all of them) |
| a folder without `index.md` | `/docs/<folder>/`, generated: a list of its pages |
| `index.md` | `/docs/` (the landing page, followed by a directory of everything unless it already links to every section) |
| `README.md` anywhere | not published (the authoring guide) |
| `draft: true` | not published; links to it are reported |

URL segments are the file names lowercased, with anything other than letters
and digits turned into hyphens.

Front matter, all optional:

| Key | Effect |
|---|---|
| `title` | Page title. Default: the file's leading `# Heading`, else the file name |
| `description` | Meta description, cards and search snippets. Default: the first paragraph, cut to 160 characters (with a warning) |
| `order` | Position within its folder; then alphabetical by title |
| `tags` | Pages sharing tags appear under each other's **Related topics** |
| `related` | Paths to other pages, listed first under **Related topics** |
| `feature` | Puts a link to this page under that home-page feature: `open-source`, `mnemo`, `editing`, `speleodb`, `planning`, `import-export` |
| `since` | Version that introduces the feature. Newer than the current release → a "Coming in X" notice |
| `aliases` | Old URLs (`/docs/…`) that should redirect here after a rename |
| `draft` | `true` keeps the page off the site |

Links are ordinary relative Markdown links, which also work when the files are
read on GitHub. Heading anchors use GitHub's rules (github-slugger), so
`page.md#some-heading` lands on the same heading in both places. GitHub's alert
syntax (`> [!NOTE]`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`) becomes a
callout.

## What each page gets

- The site's nav, footer, fonts and colours; a sidebar built from the folders,
  breadcrumbs and an "On this page" outline.
- **Related topics** (from `related` and shared `tags`), **Linked from**
  (every page that links to this one), previous and next in reading order, the
  last-commit date and "Edit this page on GitHub".
- Its own title, description, canonical URL, Open Graph tags and JSON-LD
  (`TechArticle`, or `CollectionPage` for section lists, plus
  `BreadcrumbList`, linked to the site's `#app`, `#org` and `#site`).
- A sitemap entry dated by the Markdown file's last commit in the app
  repository (`lastmodFor` in `build/docs/index.js`, used by `build/sitemap.js`).
- A line in `llms.txt` under **Documentation**, and its full Markdown in
  `llms-full.txt`, with every link made absolute.

Renamed pages keep working through `aliases`: GitHub Pages has no server
redirects, so the old URL gets a page with a canonical link, `noindex` and an
instant refresh.

### On the rest of the site

The links below appear only when there is at least one published page, so the
site never links to a `/docs/` that does not exist:

- **Docs** in the nav (`<!--docs-nav-->` in `src/partials/nav.html`)
- **Documentation** in the footer (`<!--docs-footer-->`)
- a link under a home-page feature, titled with the page's title, for each page
  that declares that `feature` (`<!--docs-more:<key>-->` in `features.html`)

## Images

Authors commit PNG screenshots at full size: 1920 px app windows, up to about
1.4 MB each, 9.5 MB across the guide in November 2026. `build/docs/images.js`
encodes every raster image (PNG, JPEG or WebP) as WebP:

- 800 px and 1600 px for the page, through `srcset`;
- one at the image's own size, at higher quality, for the enlarged view.

Encodes are cached by content in `node_modules/.cache/stalagmight-docs-images/`,
so dev-server rebuilds are instant. SVG and GIF files are copied unchanged.

Clicking an image, or Enter on it, opens it full size (`src/js/docs.js`), which
keeps the numbered callouts on full-window shots readable.

| Page | As committed (PNG) | Served, 1x screen | Served, 2x screen |
|---|---|---|---|
| Creating a new survey (6 images) | 2,583 KB | 122 KB | 297 KB |
| Survey view (1 image) | 1,372 KB | 47 KB | 122 KB |

At 2x zoom, text in the full-size WebP is indistinguishable from the PNG.

## Fonts on long pages

Docs pages are mostly body text, so the Barlow swap was visible there. The step
lists rewrapped when the font arrived, giving a layout shift of 0.201 on mobile
and failing Lighthouse's Agentic Browsing check. `style-base.html` now defines
`Barlow Fallback` and `Rajdhani Fallback`: local Arial scaled to the web fonts'
width (measured on the guide's text), with ascent and descent from the fonts'
own metrics. With the web fonts blocked and then loaded, no text block in the
first screen moves at phone width. Live Lighthouse on docs pages afterwards:
layout shift 0 to 0.001, every category 99-100 on mobile and desktop. On a
wide desktop column, a line sitting exactly at the wrap point can still break
differently, since the widths match on average, not line by line.

## Search

[Pagefind](https://pagefind.app) runs after Vite (`npm run build` is
`vite build && pagefind --site dist`) and writes a static index to
`dist/pagefind/`. There is no server and no third party, and a browser loads
only the index chunks a query needs.

- **What is indexed:** doc pages and the home page's feature text. Pages with
  `data-pagefind-body` are indexed and everything else is skipped, so the
  releases page, generated section lists and redirects stay out. The
  breadcrumbs, the meta footer, heading permalinks and the home page's
  download area carry `data-pagefind-ignore`.
- **Filter:** results can be narrowed by top-level section
  (`data-pagefind-filter="section:…"`).
- **UI:** `src/js/docs.js` opens a dialog from the sidebar button, `/` or
  Ctrl/⌘+K, and loads Pagefind's UI only then.
- **Dev server:** no index exists there, so the dialog says search needs a
  build.

## Broken links warn; they do not fail the build

Every link and image is checked:

- a missing page, file or image
- a missing anchor, on the same page or on another one
- a link to a draft
- a path that escapes the repository
- an invalid alias or invalid front matter

Each produces a warning naming the file. In CI it is also an annotation on the
workflow run. The link renders as plain text with a wavy underline instead of
a 404.

It is deliberately not a build failure. The docs are written in another
repository whose authors don't watch this one's runs, and a failure would
block every deploy of the website, the scheduled release refresh included,
until someone noticed. A link to a missing anchor falls back to the page
itself.

## Freshness and deploys

- **Pages (CI):** the workflow checks out only `docs/user-guide/` of the app
  repository into `.app/`, with history but without old file contents, and
  builds. The six-hourly schedule picks up doc changes, so an edit is live
  within six hours. With no such folder upstream, the site builds without
  docs.
- **VPN copy (local `npm run build`):** npm's `prebuild` step runs
  `build/docs-pull.mjs`, which keeps `.app/` as a sparse, blob-less clone and
  pulls it. It is about 13 MB, git-ignored, and never fails the build: offline,
  it uses what is there.
- **Docs follow `master`** of the app repository, not the latest release. Pages
  about unreleased features use `since:`.

## Working on the pipeline

```bash
npm run dev:fixtures      # dev server with the sample guide, live reload on edits
npm run build:fixtures    # full build with the sample guide (overwrites dist/, which is the VPN copy!)
DOCS_SOURCE=/path/to/Stalagmight/docs/user-guide npm run dev   # a local checkout of the app
```

To test without touching the VPN copy, build somewhere else:

```bash
DOCS_SOURCE=build/fixtures/user-guide npx vite build --outDir /tmp/x --emptyOutDir && npx pagefind --site /tmp/x
```

`build/fixtures/user-guide/` is a small sample guide that exercises every
feature: sections with and without `index.md`, ordering, related pages and
tags, backlinks, duplicate headings (`-1` anchors), callouts, a table, an
image, a downloadable file, a link outside the guide, an alias, a draft, a
`since` notice and a README that must not be published. It builds with zero
warnings.

| File | Role |
|---|---|
| `build/docs/index.js` | The Vite plugin: generation, dev-server watch, nav/footer/feature links, redirects, `llms.txt` and `llms-full.txt`, `lastmodFor` |
| `build/docs/model.js` | Reads the folder: front matter, routes, sections, order, link resolution and checking, backlinks, related, aliases |
| `build/docs/markdown.js` | markdown-it with GitHub anchors, alerts, the link and image hooks, and sanitising of raw HTML |
| `build/docs/templates.js` | Page and redirect HTML |
| `build/docs-pull.mjs` | Keeps `.app/` current for local builds |
| `src/partials/style-docs.html` | Docs styles |
| `src/js/docs.js` | Mobile contents toggle and search |
| `src/llms.txt` | The static part of `llms.txt`; the plugin appends the docs |

`src/docs/` is a build product. The plugin wipes it on every run, and refuses
to if it lacks the marker file the plugin writes, so a hand-made folder there
is never deleted silently.

## The guide as written (9 Nov 2026)

The team's guide went live on 9 Nov 2026: 25 pages in `workflows/` (tasks),
`screens/` (one page per screen) and `concepts/`. It has no broken links and no
build warnings.

Their `README.md` is the table of contents plus contributor rules, and is not
published. No page has front matter yet, so until the team adds `order:`
(following the README's lists) and section and landing `index.md` files, the
sidebar is alphabetical and `/docs/` is the generated list. How to add them is
in the README's "Publishing on the website" section (app repo PR #658).

## Verified (8 Nov 2026, with the sample guide)

- **Pages:** every link resolves, including anchors into other pages and the
  GitHub-style `-1` duplicate anchors. A link outside the guide goes to
  GitHub, the draft and the README are not published, and the alias page
  redirects with a canonical and `noindex`.
- **Broken input:** a copy of the sample with a missing page, a missing
  anchor, a link to a draft, a missing image, a path escaping the repo, a bad
  alias and invalid YAML gave exactly those 8 warnings and still built.
- **Search** (headless Chrome): "stations" finds the 4 pages that mention it;
  "SHA256SUMS", which occurs only in release notes, finds nothing. `/` opens
  the dialog and Escape closes it.
- **Phone width:** the contents toggle works and the page has no horizontal
  scroll.
- **Without docs:** the site is unchanged. No Docs links, no feature links,
  `llms.txt` without a docs section, and two URLs in the sitemap.
- **Lighthouse** on a docs page (mobile): Performance 99, Accessibility 100,
  Best Practices 100, SEO 100.

## Known limits

- Images and links written as raw HTML (`<img src>`) are not checked or
  copied; use Markdown syntax.
- No tag pages: tags only drive **Related topics**, to avoid thin pages.
- The site nav hides its links below 900 px (on every page). Docs pages carry
  their own contents button, but on phones the home page reaches the docs
  only through its feature links and the footer.
