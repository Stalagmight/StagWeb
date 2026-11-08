# Stalagmight Website

Website for the Stalagmight cave mapping software project.

## Workflow

- Commit and push all changes granularly after every meaningful change
- All documentation goes under `./docs/`
- For any feature planning, ask exhaustive questions until confident about the implementation before writing code

## Never put source files in `dist/`

`vite build` runs with `emptyOutDir: true`, so **`dist/` is wiped on every
build**. Screenshots or any other input dropped there survive exactly until the
next build. Captures belong in `assets/screenshots/<name>/`.

## Downloads come from GitHub, never from this repo

Download links are filled in by the browser from the GitHub API
(`src/js/releases.js`). The `/releases/` list is also written into the HTML at
build time (`build/releases-snapshot.js`) so crawlers without JavaScript see it,
and the browser refreshes it. Both read GitHub when they run, so never hard-code
a version or an asset URL. Files are matched by suffix. Release markup lives in
`src/js/changelog-render.js`, which runs in the browser and under linkedom at
build time: use the `doc`/`parse` it is handed and set attributes, not DOM
properties. See [docs/downloads.md](docs/downloads.md) before touching the
download markup or if the app's release pipeline renames its files.

## Search and AI visibility

- The name is spelled **Stalagmight** everywhere, never "StalagMight" (kept only
  as a JSON-LD `alternateName`).
- `sitemap.xml` is generated from `rollupOptions.input`: a new page is in the
  sitemap by being added there. Do not recreate `public/sitemap.xml`.
- `src/llms.txt` states facts about the app. Keep it in step with the
  features, and never put a version number in it. The build appends the docs
  pages to it and writes `llms-full.txt`.

Status, measurements and the off-site to-do list: [docs/seo.md](docs/seo.md).

## The user guide comes from the app repository

`/docs/` is generated from `docs/user-guide/` in `Stalagmight/Stalagmight` by
`build/docs/` into the git-ignored `src/docs/`. Never edit or create files in
`src/docs/`; they are wiped on every build. Authors work in the app repo
(rules in its `docs/user-guide/README.md`). `npm run build` first pulls that
folder into `.app/`. Test with `build/fixtures/user-guide/`, but
`npm run build:fixtures` overwrites `dist/`, which is the live VPN copy: build
to another `--outDir` instead. See
[docs/user-guide-pipeline.md](docs/user-guide-pipeline.md).


## Screenshot animations

`assets/build-anim.py` turns a folder of PNG captures into a registered,
cropped, animated WebP for the site. Captures of the same window are never
pixel-identical, so it detects the app window, removes the desktop around it,
and registers the frames against each other before encoding — otherwise the
result twitches on every frame change. It reports `all frames aligned` when the
residual shift of every frame is zero; treat anything else as a failure.

Deployed output goes in `public/media/`. See
[docs/screenshot-animations.md](docs/screenshot-animations.md).

## DMP Import Dialog Sequence

Mock dialogs live in `./docs/mockups/dmp-import/`. The import wizard flows through these steps:

1. **Section Selection** (`01-section-selection.html`) — User picks a `.dmp` file; the dialog shows file metadata (shot count, total length, depth range), warns about already-imported sections, and presents a checkbox table of all sections. Bulk select/deselect controls and default surveyor/date fields apply to the batch.

2. **Zero Datum Configuration** (`02-zero-datum-config.html`) — For the first section, the user anchors it to GPS coordinates by choosing a station as the zero datum. A left-panel SVG preview shows the station layout. The right panel holds GPS input (DD format), section metadata (name, surveyor, date, color, direction), and a shot table with continuous depth-in/depth-out values.

3. **Suggesting** (`03-suggesting.html`) — For each subsequent section, the system suggests a connection point to an already-placed section based on shot matching. Shows confidence badge, merge-station mapping, overlap mode selector, and alternative connection options. Section settings and shot table are editable below.

4. **Manual Placing** (`04-manual-placing.html`) — When no suggestion is accepted (or none exists), the user picks a placement mode: use previous suggestion, connect from an existing station, manual map placement, or skip. A radio-card UI with nested controls for each mode. Section settings and shot table follow.
