# Deployment

The site is hosted on **anzu** (`10.10.0.220`) and reachable from anywhere on
the VPN at:

**<https://stalagmight.anzu.nevim.co/>**

Valid Let's Encrypt certificate (issued via Cloudflare DNS-01), no auth. Caddy
binds only to the WireGuard address, so the site is **not** reachable from the
public internet even though the DNS name is public.

## How it is wired

```
browser (VPN) ──► Caddy :443 on 10.10.0.220     (~/srv/infra/Caddyfile)
                    │  vhost stalagmight.anzu.nevim.co
                    ▼
                  nginx  127.0.0.1:60870         (container stalagmight-web)
                    │  /usr/share/nginx/html  (ro bind mount)
                    ▼
                  ./dist                         (vite build output)
```

Two pieces of host infra, both in `~/srv/infra/`:

- **`docker-compose.yml`** — service `stalagmight-web` (`nginx:alpine`,
  `restart: unless-stopped`) publishing `127.0.0.1:60870` and read-only
  bind-mounting this repo's `dist/` as its web root.
- **`Caddyfile`** — vhost `stalagmight.anzu.nevim.co` reverse-proxying to
  `localhost:60870`.

Because `dist/` is bind-mounted live, **nginx serves whatever is currently in
`dist/`** — there is no copy step and no container restart needed to publish.

## Publishing a change

```bash
npm run build          # regenerates dist/ — that is the whole deploy
```

Reload the browser and the change is live. `vite build` inlines all partials
into a single `dist/index.html` and copies `public/` (the dialog mockups and
`app-preview.html`) verbatim.

## Local development

```bash
npm run dev            # vite dev server on http://10.10.0.220:8084
```

Note that port `8084` is also what Caddy's `crypto.anzu.nevim.co` vhost proxies
to on `localhost`. There is no conflict — the vite dev server binds only to
`10.10.0.220`, not `localhost` — but don't switch it to `localhost` or the two
will collide.

## Operations

```bash
cd ~/srv/infra

docker compose ps stalagmight-web          # status
docker compose restart stalagmight-web     # restart nginx
docker compose logs -f stalagmight-web     # access logs
docker compose down stalagmight-web        # take the site offline
```

### Editing the Caddyfile — read this first

`Caddyfile` is bind-mounted into the caddy container as a **single file**. Any
editor that writes a temp file and renames it over the original replaces the
inode, and the container keeps serving the *old* content — `caddy reload` then
reports `config is unchanged` and silently does nothing.

After editing `~/srv/infra/Caddyfile`, verify the container actually sees the
change before trusting a reload:

```bash
docker exec caddy grep -c stalagmight /etc/caddy/Caddyfile   # must be non-zero
```

If it is zero, recreate the container to refresh the mount:

```bash
cd ~/srv/infra && docker compose up -d --force-recreate caddy
```

Certificates live in the `caddy-data` volume and survive the recreate, so the
restart costs about a second of downtime for the other vhosts.
