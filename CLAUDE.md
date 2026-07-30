# Stalagmight Website

Website for the Stalagmight cave mapping software project.

## Workflow

- Commit and push all changes granularly after every meaningful change
- All documentation goes under `./docs/`
- For any feature planning, ask exhaustive questions until confident about the implementation before writing code

## Never put source files in `dist/`

`vite build` runs with `emptyOutDir: true`, so **`dist/` is wiped on every
build**. Screenshots or any other input dropped there survive exactly until the
next build. Captures belong in `docs/media-src/<name>/`.

## Screenshot animations

`docs/media-src/build-anim.py` turns a folder of PNG captures into a registered,
cropped, animated WebP for the site. Captures of the same window are never
pixel-identical, so it detects the app window, removes the desktop around it,
and registers the frames against each other before encoding — otherwise the
result twitches on every frame change. It reports `all frames aligned` when the
residual shift of every frame is zero; treat anything else as a failure.

Deployed output goes in `public/media/`. See
[docs/media-src/README.md](docs/media-src/README.md).

## DMP Import Dialog Sequence

Mock dialogs live in `./docs/mockups/dmp-import/`. The import wizard flows through these steps:

1. **Section Selection** (`01-section-selection.html`) — User picks a `.dmp` file; the dialog shows file metadata (shot count, total length, depth range), warns about already-imported sections, and presents a checkbox table of all sections. Bulk select/deselect controls and default surveyor/date fields apply to the batch.

2. **Zero Datum Configuration** (`02-zero-datum-config.html`) — For the first section, the user anchors it to GPS coordinates by choosing a station as the zero datum. A left-panel SVG preview shows the station layout. The right panel holds GPS input (DD format), section metadata (name, surveyor, date, color, direction), and a shot table with continuous depth-in/depth-out values.

3. **Suggesting** (`03-suggesting.html`) — For each subsequent section, the system suggests a connection point to an already-placed section based on shot matching. Shows confidence badge, merge-station mapping, overlap mode selector, and alternative connection options. Section settings and shot table are editable below.

4. **Manual Placing** (`04-manual-placing.html`) — When no suggestion is accepted (or none exists), the user picks a placement mode: use previous suggestion, connect from an existing station, manual map placement, or skip. A radio-card UI with nested controls for each mode. Section settings and shot table follow.
