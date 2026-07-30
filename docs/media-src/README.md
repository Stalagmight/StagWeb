# Media sources

Original screenshots for the animations and the hero image. These are the
inputs; what the site serves lives in `public/media/`.

## Never drop captures in `dist/`

`vite.config.js` builds with `emptyOutDir: true`, so **everything in `dist/` is
deleted on the next `npm run build`** — including anything you put there by
hand. A folder of screenshots left in `dist/screenshots/` has a lifetime of one
build. Put new captures in `docs/media-src/<name>/` instead.

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
docs/media-src/build-anim.py docs/media-src/<folder> public/media/<name>.webp \
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

| Folder | Output | Command |
|---|---|---|
| `station-merge/` | `public/media/station-merge.webp` (41 KB, 8.0 s) | `--holds 12,7,6,5,4,4,4,5,15,18 --width 1000 --quality 75 --window full --crop 1923x1250+588+140` |
| `speleodb-features/` | `public/media/speleodb.webp` (206 KB, 10.0 s) | `--holds 9,7,9,13,9,5,6,13,9,20 --width 1000 --quality 76` |
| `main.png` | `public/media/app-main-{1600,2200}.webp` | see below |

`station-merge` is full-screen, so it needs `--window full` plus a `--crop` to
the map viewport — the whole app at 640 px on the page is unreadable.
`speleodb-features` is a floating window and registers on its own.

Why `speleodb.webp` is 206 KB against station-merge's 41 KB: dialogs redraw the
whole window rather than one corner of the map, so there is little for the
encoder to reuse. VP9 (224 KB) and H.264 (308 KB) were both tried and neither
is enough better to give up a plain `<img>` — which is what lets `<picture>`
serve a still under `prefers-reduced-motion`.

## Hero image

```bash
for w in 1600 2200; do
  magick docs/media-src/main.png -resize ${w}x -strip -quality 82 \
    -define webp:method=6 public/media/app-main-${w}.webp
done
```
