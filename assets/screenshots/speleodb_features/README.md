# speleodb-features source frames

Ten window captures of the SpeleoDB round-trip, in timestamp order:

1. File menu, **Publish to SpeleoDB**
2. Publish dialog, empty
3. Publish dialog filled (Naharon / Nahron Resurvey / Mexico / Private)
4. Scrolled to collaborators + coordinates, **Publish**
5. Back on the map with the `SpeleoDB . read-only` badge
6-7. Editing after taking the write lock
8. **Finish editing** - commit message, *Upload & release*
9. SpeleoDB submenu (start editing / push / refresh / open on web / settings)
10. **SpeleoDB project** dialog, History tab: revisions with View / Revert

A floating window, captured at sizes between 1440x1098 and 1454x1124 and sitting
a few pixels off between shots. Registration handles both — no manual crop.

```bash
../../build-anim.py . ../../../public/media/speleodb.webp \
    --holds 9,7,9,39,9,5,6,39,9,60 --width 1000 --quality 76 --report
```

See [../../../docs/screenshot-animations.md](../../../docs/screenshot-animations.md) for what the pipeline does and why.
