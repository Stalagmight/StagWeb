# SEO and AI visibility

Goal: rank in search engines and get cited in AI answers for **Stalagmight**,
**underwater cave survey software**, **cave diving software** and, longer term,
**cave survey**.

## Audit, 8 Nov 2026

### Crawler access: open

- `robots.txt` allows everything. The live copy matches `public/robots.txt`, so
  Cloudflare's managed robots.txt is not adding rules.
- The home page answered 200 to 17 crawler user agents: Googlebot, Bingbot,
  GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot,
  PerplexityBot, Perplexity-User, CCBot, Google-Extended, Applebot-Extended,
  Bytespider, meta-externalagent, DuckAssistBot and Amazonbot. Cloudflare's
  AI-bot blocking also uses verified-bot IP ranges, which a spoofed user agent
  cannot test. Confirm in the dashboard (see the to-do list below).
- www → apex, http → https and `/releases` → `/releases/` all return 301. The
  canonical tags are correct, and missing pages return a real 404.
- `stalagmight.github.io/StagWeb/` redirects to `http://stalagmight.com/`, which
  then redirects to https: two hops, harmless. GitHub sets this.

### Index coverage

| Index | Feeds | Found |
|---|---|---|
| Google | Google, Gemini, AI Overviews | Home page only; `/releases/` not indexed |
| Bing | ChatGPT search, Copilot, DuckDuckGo, Yahoo, Ecosia | Probably: DuckDuckGo, which is largely Bing-backed, lists the home page 3rd for "stalagmight". Bing itself serves junk to automated browsers, so this needs Bing Webmaster Tools to confirm |
| Brave | Claude's web search and other AI tools | **Not indexed.** For "stalagmight underwater cave survey software", the GitHub repo and a fork of it rank and the site does not appear |

Brave has no submission tool. It finds pages through links and Brave browser
visits, so inbound links are the only lever there.

### Rankings (Google)

| Query | Position | Who holds it |
|---|---|---|
| stalagmight | 2 | A Roblox game wiki is 1st; also `stalagmight.app` (a cave quiz game), Hypixel, WildStar and a Binding of Isaac mod |
| stalagmight cave survey software | 1 | — |
| cave survey software | not in top 10 | Survex, CaveWhere (site **and** its Microsoft Store page), Therion, Walls, cSurvey, SexyTopo, a Reddit thread |
| underwater cave survey software | not in top 10 | Ariane's Line / mNemo, CaveWhere, CaveDiveMap, Caveatron |
| cave diving software | not in top 10 | Ariane's Line, Bombimi Cave, surveydown.com, CaveDiveMap |

### On the page

- Home page: **339 words** a crawler can read. "Cave diving" appears in the meta
  description but never in the visible text. The six feature descriptions are
  the customer's wording and stay as written; new pages are where target
  phrases go.
- `/releases/`: 31 words without JavaScript before the snapshot; **about 15,600**
  with it.

### Lighthouse (mobile)

A report taken at 20:49 UTC scored Performance 78, Accessibility 97, Best
Practices 100, SEO 100 and Agentic Browsing 100. Its 500 ms Total Blocking Time
and "1.5 MB of unused JavaScript" were a Chrome extension
(`chrome-extension://aadbahhifnekkkcbapdfandpimaoacmj`) in the profile that ran
it. Run Lighthouse in a clean profile or incognito window, or use PageSpeed
Insights. Three clean runs of the same build scored Performance 91–99 with TBT
0 ms.

The site's own findings, and what was done:

| Finding | Fix | Result (local, 3 runs each) |
|---|---|---|
| Render-blocking Google Fonts stylesheet, ~770 ms | Fonts self-hosted, unhinted, fingerprinted, the first screen's faces preloaded | First paint 1.7 s steady (was 1.7–2.7 s); LCP 2.4 s (was 2.3–2.9 s) |
| Layout shift 0.016 when the hero text's font swapped in | The same preloads | 0.001–0.005 |
| No `<main>` landmark | Added | Accessibility 100 |
| Hero screenshot 1600 px on a phone, 56 KB wasted | 800 and 1200 px sizes added | 26 KB on phones |
| SpeleoDB mark 8.5 KB for a 34 px mask | 102 px, alpha only | 5.5 KB |
| Short cache lifetimes; first byte up to 840 ms | Not in this repo: GitHub Pages sets the headers. Cloudflare rules in the to-do list below | — |

Not done: the feature clips' still frames are 1000 px for slots about 360 px
wide on phones, ~50 KB in all. Smaller sizes would mean reworking the script
that swaps each clip between its still and its animation, for a small saving.

## What is in place

| | |
|---|---|
| `<title>` | Name first, then the two categories worth ranking for |
| `meta description` | 157 characters, inside the usual truncation point |
| `link rel=canonical` | `https://stalagmight.com/`. The site answers on four hostnames (apex, www, `stalagmight.github.io/StagWeb`, and the VPN copy); without this they compete as duplicates |
| Open Graph + Twitter | Complete on both pages. The card image is a real 3.7 km survey rather than a logo |
| Icons | `favicon.svg`, `.ico`, `apple-touch-icon` |
| `robots.txt` | Allows all, plus `Content-Signal: search=yes, ai-input=yes, ai-train=yes`, Cloudflare's directive for saying AI search, answers and training are welcome. Crawlers that don't know it ignore the line |
| `sitemap.xml` | Generated at build from `rollupOptions.input` (`build/sitemap.js`). `lastmod` is each page's last commit, and `/releases/` also counts its newest release |
| `llms.txt` | A plain-fact summary for AI agents: what it is, formats, platforms, links. No version number, so it cannot go stale |
| JSON-LD | `SoftwareApplication` + `Organization` + `WebSite`, linked by `@id`. The app carries a screenshot, image, author, `sameAs` to the repo, keywords, and `softwareVersion` / `dateModified` written in at build time. The Organization has a logo and `sameAs` to the org and the repo. `StalagMight` is an `alternateName` |
| `/releases/` snapshot | The full release list and notes are in the HTML for crawlers without JavaScript ([downloads.md](downloads.md)) |
| One name | **Stalagmight** everywhere, matching the GitHub org, the README and the release names |

The hero tagline is an `<h2>` rather than a `<div>`, so "Underwater Cave Survey &
Mapping" is part of the document outline instead of styled text.

No `aggregateRating` in the structured data. Google's software rich result wants
ratings or reviews, and inventing them is both against their guidelines and a
liability. Add it when real reviews exist.

## Off-site to-do

These are the biggest remaining levers, and none of them is code in this repo.

### Needs a repo or org admin on GitHub

The `gh` account on anzu is only an org member, so these were not applied.
GitHub repos rank 1st on Brave for the name and are heavily represented in AI
training data, which makes this the cheapest win available.

The step-by-step handoff, with UI and `gh` versions of each step, is
**[github-admin.md](github-admin.md)**. It covers:

- the app repo's description, topics and social preview image
- the org's name and description, pinned repos and profile README
- optionally, verifying the Pages domain

`StagWeb`'s description was corrected to the new spelling on 8 Nov 2026.

### Search consoles (both verified)

- **Google Search Console:** resubmit `https://stalagmight.com/sitemap.xml`,
  then use URL Inspection → Request indexing on `/releases/`.
- **Bing Webmaster Tools:** resubmit the sitemap and check that the home page is
  indexed. This index feeds ChatGPT search, Copilot and DuckDuckGo.

### Cloudflare dashboard

- **AI Crawl Control:** every AI crawler on Allow.
- **Caching → Configuration → Crawler Hints:** on. It sends IndexNow pings to
  Bing and others whenever content changes, at no cost.
- **Managed robots.txt:** leave off; it would prepend AI-blocking rules.
- **Bot Fight Mode:** off, or check that verified bots still get through.
- **Cache the HTML at the edge.** HTML is not cached today
  (`cf-cache-status: DYNAMIC`), so every visit waits on GitHub Pages: Lighthouse
  measured the first byte at 60–840 ms. Add a Cache Rule for hostname
  `stalagmight.com`: **Eligible for cache**, Edge TTL **10 minutes**, Browser
  TTL **respect origin**. Deploys then take up to 10 minutes to show, which the
  6-hourly schedule and the in-browser release refresh do not mind.
- **Long browser cache for `/assets/*`.** Those files are fingerprinted by Vite
  (scripts, fonts), so they never change under the same name. A Cache Rule for
  URI path starting with `/assets/`: Browser TTL **1 year**. Leave `/media/`
  on the default: those names are reused when a screenshot is re-cut.

### Listings that rank on their own

CaveWhere's Microsoft Store page ranks 4th on Google for "cave survey software".
Store and directory pages are cheap authority:

- Flathub (Linux), winget and the Microsoft Store (Windows), a Homebrew cask (macOS).
- AlternativeTo, listed as an alternative to Ariane, Compass, Walls, Survex,
  Therion and CaveWhere.

These belong in the app repo's release pipeline, not here.

### Links and mentions from the community

For anything beyond the name, this outweighs everything on the page. AI answers
lean on the same sources.

- **SpeleoDB:** a link back from its site and docs (the integration is real).
- **Reddit** r/cavediving and r/caving. The thread "Cave survey Software and
  Programs" ranks 3rd for "cave survey software", and Reddit is licensed to
  Google and OpenAI for AI training.
- **surveydown.com**, which writes underwater survey tutorials and names Walls,
  Compass and Ariane.
- Cave-diving and caving organisations: NSS-CDS, the NSS Survey and Cartography
  Section, BCRA's Cave Surveying Group (*Compass Points*), CDG, European
  federations, ScubaBoard.
- **Wikipedia's "Cave survey"** article has a software section. Only once
  independent sources exist, and never added by the project itself (conflict of
  interest).

## What the keywords are actually worth

| Target | Realistic? | Why |
|---|---|---|
| **Stalagmight** | Yes | 2nd today. The competition is game wikis and a quiz app with the same name. Consistent spelling, `sameAs`, GitHub metadata and links using the exact spelling are what move it to 1st. |
| **Underwater cave survey software** | Yes, the best target | Small field (Ariane's Line, CaveDiveMap), and the intent is exactly right. |
| **Cave diving software** | Yes | Low volume and low competition, but needs the phrase on a page that is about it. Not on the home page today. |
| **mNemo software / mNemo DMP** | Yes | Only Ariane's Line competes. A documentation page on DMP import is the natural home. |
| **Cave dive planning** | Plausible | Mixed intent; a gas-reach planning page could win the tool half. |
| **Cave survey software** | Long term | Held by Survex, CaveWhere, Therion, Walls, cSurvey and Reddit. Needs a body of content and links. |
| **Cave diving** | No | Very competitive, informational, and almost none of that traffic wants software. |

## Next: web documentation

The documentation planned next is the content these targets need. To make each
page count:

- **One topic per page**, with the phrase in the `<title>`, the `<h1>` and the
  first paragraph. Examples: importing mNemo DMP files, dive and gas planning,
  loop closure, Ariane / Compass import, SpeleoDB.
- **Add each page to `rollupOptions.input`.** The sitemap follows automatically.
- **Static HTML**, as the home page is. Most AI crawlers do not run JavaScript.
- **Plain factual sentences** AI answers can quote: "Stalagmight imports mNemo
  `.dmp` files, versions 2 to 5."
- **Per page:** a canonical, a description, Open Graph tags, and
  `TechArticle` + `BreadcrumbList` JSON-LD.
- Link the pages from the home page and the footer (the Documentation link comes
  back), and list them in `llms.txt`.
- A **comparison page** (Ariane, Compass, Walls, Survex, Therion, CaveWhere) and
  an **FAQ** are the pages AI answers cite most. Worth adding once the docs exist.

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
