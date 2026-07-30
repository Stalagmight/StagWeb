# Design directions

Fifteen alternative designs for the site, all carrying **identical content**:
same copy, same six features, same four import dialogs, same app preview. Only
the design changes.

Browse them at **<https://stalagmight.anzu.nevim.co/designs/>**. Sources are
self-contained files in `public/designs/` — no shared CSS with `src/`, so
editing one cannot affect another or the live site.

## Why these, and not the obvious ones

Current AI-generated design clusters around three looks: cream paper with a
high-contrast serif and a terracotta accent; near-black with one acid accent;
and broadsheet hairline columns. The existing site sits close to the second.
These fifteen deliberately spend their freedom elsewhere, mostly by borrowing
from artifacts that already exist in a cave surveyor's world — charts, slates,
notebooks, drawings, lithology hatching — rather than from landing-page
convention.

## The set

| # | Direction | Thesis | Signature device |
|---|---|---|---|
| 01 | Admiralty chart | Hydrographic chart conventions | Depth-sounding field; chart magenta reserved for instrument data; italic serif for water features; title cartouche instead of a hero |
| 02 | Dive table | Waterproof slate, safety yellow | Hero is a dive profile with the four import steps plotted as decompression stops; features are a real spec table |
| 03 | Survey wetnotes | The notebook you actually write in | Gridded slate with punched binding margin; pencil line plot annotated with bearings; one marginal note in red correction pencil |
| 04 | Piranesi grotto | 18th-century engraved plate | Gold leaf on rules only; rocaille corner pieces; drop cap; each dialog framed as a numbered plate |
| 05 | Bathymetric descent | The page is a water column | Real depth ramp; fixed margin gauge reading scroll position as a depth; each section at its own contour |
| 06 | Swiss map sheet | Maximum restraint | Printed sheet margin with coordinate graticule; the twelve-column grid is printed, not hidden; alternating scale bar |
| 07 | Instrument panel | The device in your hand | Anodised panels with real screws; transflective LCD holding the copy; annunciator LEDs; membrane keys that press |
| 08 | Geological section | Karst only makes sense in its host rock | Authentic lithology hatching (offset ashlar limestone, stippled sandstone, dashed shale); hero is a cross-section with the surveyed void cut through the beds |
| 09 | Riso club bulletin | A caving club printing its own | Two spot inks on newsprint; halftone screen; headline printed three times out of register; hand-cut clippings |
| 10 | Expedition feature | A magazine picture story | Opener is a cave scene built entirely in SVG — light shaft, caustics, silt, one lamp; caption rail; alternating spreads |
| 11 | Deco expedition poster | 1930s travel poster | Strict bilateral symmetry; brass sunburst; stepped arch; drawn ziggurat divider |
| 12 | The anti-landing-page | Refuse marketing conventions | The site is the app's own workspace: outline rail, dense data grid, line-numbered prose, keyboard hints, status bar |
| 13 | Cyanotype drawing | Engineering drawing sheet | Zone letters and numbers on the frame; dimension lines with arrowheads; real title block; parts list; revision table |
| 14 | Kinetic descent | One orchestrated scroll | Water column cross-fades daylight → floor; shafts fade; silt drifts up; line plot draws itself; HUD reads depth |
| 15 | Neo-Memphis stickers | A free hobbyist tool need not look like military hardware | Everything is a sticker: thick outline, flat high-chroma fill, hard offset shadow, presses when touched |

Roughly: **04, 07, 10, 11, 14** are the fancier end; **01, 02, 03, 06, 08, 09,
12, 13** are the domain-grounded end; **15** is the deliberate outlier.

## House rules every direction follows

- Responsive to mobile, visible keyboard focus, `prefers-reduced-motion`
  respected. In 14, reduced motion yields the still version of the page —
  nothing stays hidden.
- Numbered markers appear **only** where order carries information (the import
  wizard genuinely is a sequence). The six features are never numbered
  `01/02/03` for decoration.
- The empty `<p></p>` under "See It in Action" in the live site is filled with
  real copy in every direction — worth folding back into `src/`.

## Notes for whoever picks one

Each file is standalone, so promoting a direction means porting its CSS into
`src/index.html` and its markup into the seven partials — not copying the file
over `src/`. The dialog and app-preview iframes already point at the same
absolute paths the live site uses, so those need no change.
