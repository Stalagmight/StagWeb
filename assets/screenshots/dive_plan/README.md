# dive_plan source frames

Six captures of Plan mode, in timestamp order:

1. gas-reach field — stations shaded by the gas needed to reach them, with the
   RMV / swim-speed / gas-strategy panel and the depth profile
2. planned route drawn through the survey
3. station context menu: set as start point / way point / endpoint / marked point
4. more points marked; profile picks up Stage 1, Stage 2 and Turn markers
5. context menu again, this time setting stage 1 / stage 2 drops
6. finished plan — stage drops placed, gas reach 2,428 L, profile with WP1 and turn

Feeds `public/media/dive-plan.webp` (Dive Planning row).

```bash
../../build-anim.py . ../../../public/media/dive-plan.webp \
    --holds 14,10,12,10,12,20 --width 1000 --quality 76 --report
```

See [../../../docs/screenshot-animations.md](../../../docs/screenshot-animations.md).
