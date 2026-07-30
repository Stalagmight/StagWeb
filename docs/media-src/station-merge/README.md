# station-merge source frames

Ten screenshots of the station-merge interaction, in timestamp order:

1. survey plot, loose segment above the main line
2. tool menu open (Move segment / Move shot / Move station)
3. station selected
4-8. segment dragged down toward the neighbouring station
9. **Merge Stations** dialog (Station A 34:0 / Station B 35:1)
10. merged result, auto-save pending

These are the source for `public/media/station-merge.webp`, which is what the
site actually serves. Kept here because the originals were dropped in `dist/`,
and `vite build` runs with `emptyOutDir: true` — anything in `dist/` is deleted
on the next build.

## Re-encoding

Crop is the map viewport, `1923x1250+588+140` out of the 3072x1920 frame,
scaled to 1000px wide. Holds are expressed as duplicate frames at 10 fps; the
libwebp animation encoder collapses runs of identical frames into one frame
with a longer delay, so the output is 10 frames totalling 8.0 s.

```bash
i=1; mkdir -p frames seq
for f in *.png; do
  magick "$f" -crop 1923x1250+588+140 +repage -resize 1000x -strip \
    "frames/$(printf '%02d' $i).png"; i=$((i+1))
done
n=0; idx=1
for h in 12 7 6 5 4 4 4 5 15 18; do          # tenths of a second per frame
  for _ in $(seq 1 $h); do n=$((n+1));
    ln -s "$PWD/frames/$(printf '%02d' $idx).png" "seq/$(printf '%04d' $n).png"; done
  idx=$((idx+1))
done
ffmpeg -y -framerate 10 -i seq/%04d.png -c:v libwebp_anim \
  -lossless 0 -q:v 75 -compression_level 6 -loop 0 station-merge.webp
magick station-merge.webp -coalesce -delete 1--1 -strip station-merge-still.webp
```
