# speleodb-features source frames

Ten window captures of the SpeleoDB round-trip, in timestamp order:

1. File menu, **Publish to SpeleoDB**
2. Publish dialog, empty
3. Publish dialog filled (Naharon / Nahron Resurvey / Mexico / Private)
4. Scrolled to collaborators + coordinates, **Publish**
5. Back on the map with the `SpeleoDB · read-only` badge
6-7. Editing after taking the write lock
8. **Finish editing** — commit message, *Upload & release*
9. SpeleoDB submenu (start editing / push / refresh / open on web / settings)
10. **SpeleoDB project** dialog, History tab: revisions with View / Revert

Source for `public/media/speleodb.webp`.

## Note on canvas size

These captures vary between 1440x1098 and 1454x1124, and the app's status bar
sits at the bottom of each window — so cropping to a fixed height from the top
made it jitter. The crop is `1436x1020+0+0`, which lands above the status bar in
even the shortest frame.

## Re-encoding

```bash
i=1; mkdir -p frames seq
for f in *.png; do
  magick "$f" -crop 1436x1020+0+0 +repage -resize 1000x -strip \
    "frames/$(printf '%02d' $i).png"; i=$((i+1))
done
n=0; idx=1
for h in 9 7 9 13 9 5 6 13 9 20; do          # tenths of a second per frame
  for _ in $(seq 1 $h); do n=$((n+1));
    ln -s "$PWD/frames/$(printf '%02d' $idx).png" "seq/$(printf '%04d' $n).png"; done
  idx=$((idx+1))
done
ffmpeg -y -framerate 10 -i seq/%04d.png -c:v libwebp_anim \
  -lossless 0 -q:v 76 -compression_level 6 -loop 0 speleodb.webp
magick speleodb.webp -coalesce -delete 1--1 -strip speleodb-still.webp
```

VP9 (224 KB) and H.264 (308 KB) were both tried; neither beat WebP meaningfully
because there are only ten distinct full-window images, and video codecs smear
crisp UI text at these rates.

## main.png

`../main.png` is the hero screenshot, resized to `public/media/app-main-{1600,2200}.webp`:

```bash
for w in 1600 2200; do
  magick main.png -resize ${w}x -strip -quality 82 -define webp:method=6 \
    app-main-${w}.webp
done
```
