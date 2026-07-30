# Screenshot animations

Source captures live in `assets/screenshots/<name>/`; the tool is
`assets/build-anim.py`; what the site serves lives in `public/media/`.

## Never drop captures in `dist/`

`vite.config.js` builds with `emptyOutDir: true`, so **everything in `dist/` is
deleted on the next `npm run build`** — including anything you put there by
hand. A folder of screenshots left in `dist/screenshots/` has a lifetime of one
build. Put new captures in `assets/screenshots/<name>/` instead.

## Building an animation

`build-anim.py` takes a folder of PNGs and writes a registered, cropped,
animated WebP. Screen captures of the same window are never pixel-identical, so
it does three things before encoding:

1. **finds the app window** and crops the desktop away (`--window auto`), or
   takes the frame as-is for full-screen captures (`--window full`);
2. **registers** every frame against a reference by FFT phase correlation, which
   removes the few-pixel jitter between shots;
3. **trims** to the region all frames still cover after shifting, plus
   `--inset` px to clear the window's rounded corners.

It prints `registration : all frames aligned` when every frame's residual shift
is zero. If it says `STILL OFF`, the animation will twitch — raise `--passes`,
or `--band` if a large centred dialog is competing with the window edges.

```bash
assets/build-anim.py assets/screenshots/<folder> public/media/<name>.webp \
    --holds 9,7,9,13,9,5,6,13,9,20 --width 1000 --quality 76 --report
# then the reduced-motion still:
magick public/media/<name>.webp -coalesce -delete 1--1 -strip \
    public/media/<name>-still.webp
```

`--holds` is tenths of a second per frame, one number per input file. Holds are
written out as repeated frames at 10 fps; libwebp collapses each run into a
single frame with a longer delay, so the encoded file has exactly as many frames
as there are inputs. Give the frames people need to *read* — dialogs, results —
1.3–2.0 s, and drag steps 0.4–0.5 s.

### Two things worth knowing

- **`--window auto` cannot detect a full-screen capture.** A dark app on a dark
  desktop has no contrast at the window edge, so the detector locks onto the
  bright content core and silently crops the side panels off. It warns when the
  detected window is under 60% of the frame; pass `--window full` for those.
- **Correlation uses only a `--band`-px frame around the edges**, because the
  window border is static and the interior is where dialogs open. A
  proportional mask was not tight enough — SpeleoDB's history dialog reached
  into it and registration never converged.

## What is here

All paths relative to `assets/screenshots/`. Every one of these reports
`all frames aligned`.

| Folder | Feature row | Output | Extra flags |
|---|---|---|---|
| `import/` | mNemo & Manual Data Entry | `data-entry.webp` (123 KB, 9.4 s) | `--holds 13,10,13,9,11,10,10,18` |
| `speleodb_features/` | SpeleoDB Support | `speleodb.webp` (206 KB, 19.2 s) | `--holds 9,7,9,39,9,5,6,39,9,60` |
| `station_merge/` | Visual-First Editing | `station-merge.webp` (41 KB, 8.0 s) | `--holds 12,7,6,5,4,4,4,5,15,18 --quality 75 --window full --crop 1923x1250+588+140` |
| `dive_plan/` | Dive Planning | `dive-plan.webp` (98 KB, 7.8 s) | `--holds 14,10,12,10,12,20` |
| `export/` | Import & Export Existing Data | `export.webp` (59 KB, 6.0 s) | `--holds 12,16,15,17 --band 90 --passes 8` |
| `main.png` | hero | `app-main-{1600,2200}.webp` | see below |

Two need non-default flags, both for reasons the report tells you about:

- `station_merge` is a **full-screen** capture, so `--window full` — auto
  detection cannot see a window edge that isn't there, and warns. It also needs
  a `--crop` to the map viewport, because the whole app at 640 px on the page is
  unreadable.
- `export` needs `--band 90`: its first frame is in Survey mode while the rest
  are in Export mode, so the two look different enough that the default 56 px
  edge band left one frame 3 px out. Widening the band fixed it; 140 px broke it
  again by pulling in interior that does change.

Why `speleodb.webp` is 206 KB against station-merge's 41 KB: dialogs redraw the
whole window rather than one corner of the map, so there is little for the
encoder to reuse. VP9 (224 KB) and H.264 (308 KB) were both tried and neither
is enough better to give up a plain `<img>` — which is what lets `<picture>`
serve a still under `prefers-reduced-motion`.

## Hero image

```bash
for w in 1600 2200; do
  magick assets/screenshots/main.png -resize ${w}x -strip -quality 82 \
    -define webp:method=6 public/media/app-main-${w}.webp
done
```
