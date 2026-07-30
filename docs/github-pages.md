# GitHub Pages

`.github/workflows/pages.yml` builds on every push to `master` and publishes
`dist/` to Pages. Nothing is committed from the build — `dist/` stays ignored.

## Why the asset paths are relative

Every asset is referenced relatively (`media/…`, not `/media/…`). Root-absolute
paths only resolve when a site is served from a domain root, which would have
made the build work at `https://stalagmight.com/` but 404 every image at
`https://stalagmight.github.io/website/`. Relative paths work at both, and on the
VPN copy, from one build.

Vite's `base` option would not have fixed this on its own: these URLs are written
by hand in HTML attributes and in the inline `<style>` block, so they never pass
through Vite's asset pipeline for rewriting.

Verified by serving `dist/` from a subdirectory and confirming all images load and
the CSS mask resolves — worth repeating if asset references are ever edited.

## Files that exist only for Pages

| File | Why |
|---|---|
| `public/CNAME` | The custom domain. GitHub rewrites this file when the domain is changed in the UI, so change it here and let it deploy, or the next deploy reverts it. |
| `public/.nojekyll` | Stops Pages running Jekyll over the output. Precautionary — nothing is currently named with a leading underscore, but Jekyll would silently drop it if anything were. |

Both live in `public/` so `vite build` copies them into `dist/`, which is what
gets uploaded. Confirmed they survive the copy.

## DNS

Apex `stalagmight.com` uses A/AAAA records to GitHub's Pages addresses; `www`
is a CNAME to `<owner>.github.io`. Full record list and the Cloudflare-specific
settings are in the repo's setup notes.

Two Cloudflare-specific traps:

- **SSL/TLS mode must be Full or Full (strict).** Flexible terminates TLS at
  Cloudflare and talks to GitHub over HTTP; GitHub then redirects to HTTPS, and
  the result is an infinite redirect loop.
- **Leave the proxy off (grey cloud) until GitHub has issued the certificate.**
  GitHub validates the domain to get a Let's Encrypt cert, and a proxied record
  hides the origin from that check. Turn the proxy on afterwards if wanted.
