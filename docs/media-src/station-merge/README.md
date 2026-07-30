# station-merge source frames

Ten screenshots of the station-merge interaction, in timestamp order:

1. survey plot, loose segment above the main line
2. tool menu open (Move segment / Move shot / Move station)
3. station selected
4-8. segment dragged down toward the neighbouring station
9. **Merge Stations** dialog (Station A 34:0 / Station B 35:1)
10. merged result, auto-save pending

Full-screen captures, so they need `--window full`; the app at full width is
unreadable at 640 px on the page, hence the crop to the map viewport.

```bash
../build-anim.py . ../../../public/media/station-merge.webp \
    --holds 12,7,6,5,4,4,4,5,15,18 --width 1000 --quality 75 \
    --window full --crop 1923x1250+588+140 --report
```

See [../README.md](../README.md) for what the pipeline does and why.
