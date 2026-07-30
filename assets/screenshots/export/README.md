# export source frames

Four captures of the export path, in timestamp order:

1. Survey mode with a shot selected in the details panel
2. Export mode — Map Image, SVG, line-weight threshold, with the print preview
3. Export mode — Survey Data, TML (Ariane)
4. the file-save dialog

Feeds `public/media/export.webp` (Import & Export Existing Data row).

Needs `--band 90`: frame 1 is in Survey mode while the rest are in Export mode,
different enough that the default 56 px correlation band left it 3 px out. 140 px
overcorrects by pulling in interior that genuinely changes.

```bash
../../build-anim.py . ../../../public/media/export.webp \
    --holds 12,16,15,17 --width 1000 --quality 76 --band 90 --passes 8 --report
```

See [../../../docs/screenshot-animations.md](../../../docs/screenshot-animations.md).
