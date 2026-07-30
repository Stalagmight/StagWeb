# SEO

## What is in place

Technical foundation, added because its absence caps everything else — none of it
creates rankings on its own:

| | |
|---|---|
| `<title>` | brand first, then the two categories worth ranking for |
| `meta description` | 157 chars, inside the usual truncation point |
| `link rel=canonical` | `https://stalagmight.com/` — the site answers on four hostnames (apex, www, `stalagmight.github.io/StagWeb`, and the VPN copy) and without this they compete as duplicates |
| Open Graph + Twitter | 14 tags, card image is a real 3.7 km survey rather than a logo |
| `favicon.svg` / `.ico` / `apple-touch-icon` | — |
| `robots.txt`, `sitemap.xml` | — |
| JSON-LD | `SoftwareApplication` + `Organization` + `WebSite`, linked by `@id` |

The hero tagline is an `<h2>` rather than a `<div>`, so "Underwater Cave Survey &
Mapping" is part of the document outline instead of styled text.

No `aggregateRating` in the structured data. Google's software rich result wants
ratings or reviews, and inventing them is both against their guidelines and a
liability. Add it when real reviews exist.

## Seeing the previews

The search and social cards render at
**<https://stalagmight.anzu.nevim.co/_previews/>** (VPN only).

They live in `docs/previews/` and are bind-mounted into the nginx container at
`/srv/previews`, served by an `alias` in `stalagmight-nginx/default.conf`. Two
reasons for that arrangement: nothing in `docs/` enters `dist/`, so no review
artifact can leak onto the public site — confirmed, `stalagmight.com/_previews/`
returns 404 — and the mount has to sit outside the document root because that
root is a read-only bind mount, so Docker cannot create a mountpoint inside it.

The board reads the live title, description and card image from stalagmight.com
rather than restating them, so it cannot drift from what is actually served.

## What the keywords are actually worth

Measured before any of the above: the page carried **242 indexable words**, and
the phrase "cave diving" appeared **zero times**. That is the whole picture — you
cannot rank for a phrase that is not on the page, and 242 words does not compete
for a head term whatever the markup says.

| Target | Realistic? | Why |
|---|---|---|
| **Stalagmight** | Yes, quickly | Coined word, no competition. The real risk is Google reading it as a typo for "stalagmite" and serving geology results. Entity signals (`Organization`, `sameAs` → GitHub, consistent naming) are what fix that, plus inbound links using the exact spelling. |
| **Cave diving software** | Yes — the one to chase | Low volume, low competition, and the intent is exactly right: someone typing this wants a tool. Needs the phrase to actually appear, and a page that is about it. |
| **Cave dive planning** | Plausible | Mixed intent — some want technique, some want a tool. The Plan-mode feature is genuinely relevant, so a page on gas-reach planning could win it. |
| **Cave survey** | Not with one page | Head term held by societies, Wikipedia and long-established survey projects. Needs a body of content, not markup. |
| **Cave diving** | No, and not worth it | Very competitive, purely informational, and almost none of that traffic wants software. Ranking here would be vanity. |

## The next lever is content, not markup

Everything above is done and there is little technical headroom left. Ranking for
anything beyond the brand term now depends on things that are writing and
outreach, not code:

1. **Pages that target one phrase each**, with substance: a comparison against
   Ariane and Compass, a page on mNemo DMP import, one on gas-reach dive
   planning, one on loop closure. Each is the kind of page that can rank because
   it is genuinely the best answer to a narrow question.
2. **Inbound links** from caving and cave-diving communities — CDS/NSS sections,
   speleo forums, the mNemo and SpeleoDB communities, European federations. For
   competitive terms this outweighs everything on-page.
3. **Real release URLs.** A download page with actual binaries and release notes
   is both a ranking asset and the thing that converts.

Worth noting the honest constraint: the six feature descriptions are the
customer's own wording, so they were not rewritten to carry keywords. Keyword
density in body copy is a weak signal anyway; new pages are the right place to
target phrases, not edits to copy that already reads well.
