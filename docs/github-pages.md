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
through Vite's asset pipeline for rewriting. It is still set to `'./'`, but for a
different reason. The bundled scripts in `assets/` are the one thing Vite writes
URLs for, and the default `/` would make them root-absolute.

Verified by serving `dist/` from a subdirectory and confirming all images load and
the CSS mask resolves — worth repeating if asset references are ever edited.

## Files that exist only for Pages

| File | Why |
|---|---|
| `public/CNAME` | The custom domain. GitHub rewrites this file when the domain is changed in the UI, so change it here and let it deploy, or the next deploy reverts it. |
| `public/.nojekyll` | Stops Pages running Jekyll over the output. Precautionary — nothing is currently named with a leading underscore, but Jekyll would silently drop it if anything were. |

Both live in `public/` so `vite build` copies them into `dist/`, which is what
gets uploaded. Confirmed they survive the copy.

## DNS (Cloudflare)

The zone is already on Cloudflare nameservers. Records to add:

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `@` | `185.199.108.153` | DNS only |
| A | `@` | `185.199.109.153` | DNS only |
| A | `@` | `185.199.110.153` | DNS only |
| A | `@` | `185.199.111.153` | DNS only |
| AAAA | `@` | `2606:50c0:8000::153` | DNS only |
| AAAA | `@` | `2606:50c0:8001::153` | DNS only |
| AAAA | `@` | `2606:50c0:8002::153` | DNS only |
| AAAA | `@` | `2606:50c0:8003::153` | DNS only |
| CNAME | `www` | `stalagmight.github.io` | DNS only |

The `www` CNAME targets the **organisation** domain with no repository path —
`stalagmight.github.io`, not `stalagmight.github.io/StagWeb`. GitHub resolves
which repository to serve from the custom domain setting, not from the DNS record.

Order matters. Add the DNS first, then set the custom domain under
**Settings → Pages**. Setting the domain before DNS resolves takes the working
`github.io` URL down — Pages starts redirecting there — while the new name does
not answer yet.

### Three Cloudflare traps

- **SSL/TLS mode must be Full or Full (strict).** Flexible terminates TLS at
  Cloudflare and talks to the origin over HTTP; GitHub redirects HTTP to HTTPS,
  and the result is an infinite redirect loop.
- **Leave the proxy off (grey cloud) until GitHub has issued the certificate.**
  GitHub validates the domain to obtain a Let's Encrypt cert, and a proxied
  record hides the origin from that check. The proxy can be switched on after
  "Enforce HTTPS" goes green.
- **Do not add a `CNAME` for the apex** even though Cloudflare permits it via
  CNAME flattening. It works, but it makes GitHub's domain verification harder to
  reason about when something breaks; the documented A/AAAA path is easier to
  debug.

## Two publishing targets, one build

The same `dist/` is served by GitHub Pages and by the internal nginx container on
anzu. That only works because the asset paths are relative — see above. Changes
reach Pages on push to `master`; the VPN copy needs `npm run build` locally.
