# import source frames

Eight captures of the mNemo DMP import, in timestamp order:

1. **Import DMP File (Step 1)** — 11_20260529-naharon.dmp (v5), 193 shots,
   1,432.6 m, depth 8.4–22.5 m, with the section checkboxes
2. default surveyor / date override applied to the batch
3. **Connection Wizard**, 0 of 4 placed — suggested join, high confidence
4. 1 of 4 placed
5. 2 of 4 placed — this one low confidence
6. manual placement: "Click to place section"
7. placed, station details showing; survey grown to 30 sections / 438 shots
8. finished import

Feeds `public/media/data-entry.webp` (mNemo & Manual Data Entry row).

```bash
../../build-anim.py . ../../../public/media/data-entry.webp \
    --holds 13,10,13,9,11,10,10,18 --width 1000 --quality 76 --report
```

See [../../../docs/screenshot-animations.md](../../../docs/screenshot-animations.md).
