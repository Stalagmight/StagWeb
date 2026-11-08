# GitHub admin tasks for search visibility

These are settings on the Stalagmight GitHub org that need an **org owner** or
a **repository admin**. Together they take about 10 minutes. Each step works
from the web UI; a `gh` command is given where one exists.

**Why:** search engines and AI assistants find Stalagmight through GitHub at
least as often as through the website. On Brave Search, which Claude's web
search uses, the GitHub repo is the top result for "stalagmight" and the
website does not appear at all. The repo currently has no description and no
topics, and the org has no name or description.

## Before you start (CLI only)

```bash
gh auth status                            # must be logged in as an owner/admin
gh auth refresh -h github.com -s admin:org   # step 4 needs this scope
```

## 1. Description on Stalagmight/Stalagmight

**UI:** <https://github.com/Stalagmight/Stalagmight> → the ⚙ next to
**About** (right column) → **Description**:

```
Free, open-source desktop software for underwater cave survey, mapping and dive planning. Imports mNemo DMP, Ariane, Compass, Walls and GPX; exports maps and survey data. Windows, macOS, Linux.
```

Leave **Website** as `https://stalagmight.com` (already set).

**CLI:**

```bash
gh api -X PATCH repos/Stalagmight/Stalagmight \
  -f description='Free, open-source desktop software for underwater cave survey, mapping and dive planning. Imports mNemo DMP, Ariane, Compass, Walls and GPX; exports maps and survey data. Windows, macOS, Linux.'
```

## 2. Topics on Stalagmight/Stalagmight

**UI:** the same **About** dialog → **Topics**. Add these 19:

```
cave-survey cave-surveying cave-diving cave-mapping underwater-cave speleology caving underwater mnemo speleodb dive-planning survey-data loop-closure gis cartography maplibre tauri rust desktop-app
```

**CLI** (this replaces the whole topic list, which is empty today):

```bash
gh api -X PUT repos/Stalagmight/Stalagmight/topics \
  -f 'names[]=cave-survey' -f 'names[]=cave-surveying' -f 'names[]=cave-diving' \
  -f 'names[]=cave-mapping' -f 'names[]=underwater-cave' -f 'names[]=speleology' \
  -f 'names[]=caving' -f 'names[]=underwater' -f 'names[]=mnemo' -f 'names[]=speleodb' \
  -f 'names[]=dive-planning' -f 'names[]=survey-data' -f 'names[]=loop-closure' \
  -f 'names[]=gis' -f 'names[]=cartography' -f 'names[]=maplibre' -f 'names[]=tauri' \
  -f 'names[]=rust' -f 'names[]=desktop-app'
```

## 3. Social preview image on Stalagmight/Stalagmight

This is the card shown when the repo link is pasted into Reddit, Slack, Discord
or forums. Today it is GitHub's generic placeholder. **UI only:**

1. Download <https://stalagmight.com/og-image.png> (1200 × 630, a real survey in
   the app).
2. <https://github.com/Stalagmight/Stalagmight/settings> → **General** →
   **Social preview** → **Edit** → **Upload an image** → choose the file.

## 4. Org name and description

**UI:** <https://github.com/organizations/Stalagmight/settings/profile>

- **Organization display name:** `Stalagmight`
- **Description:** `Free, open-source underwater cave survey, mapping and dive planning software.`
- **URL:** `https://stalagmight.com` (already set)

**CLI** (needs the `admin:org` scope from "Before you start"):

```bash
gh api -X PATCH orgs/Stalagmight -f name='Stalagmight' \
  -f description='Free, open-source underwater cave survey, mapping and dive planning software.'
```

## 5. Pin the two public repos on the org page

**UI only:** <https://github.com/Stalagmight> → **Customize pins** → pin
**Stalagmight** and **StagWeb** → **Save pins**.

## 6. Org profile README (optional, recommended)

This adds a landing text to <https://github.com/Stalagmight>. It needs a public
repo named `.github` in the org, holding `profile/README.md`.

**UI:** create a public repo `Stalagmight/.github`, then add the file
`profile/README.md` with the content below.

**CLI:**

```bash
gh repo create Stalagmight/.github --public --description 'Stalagmight organisation profile'
cat > /tmp/org-profile-README.md <<'EOF'
# Stalagmight

Free, open-source desktop software for underwater cave survey, mapping and dive
planning.

- **Download:** [stalagmight.com](https://stalagmight.com): Windows, macOS (Apple Silicon), Linux
- **Releases and changelog:** [stalagmight.com/releases](https://stalagmight.com/releases/)
- **Source code:** [Stalagmight/Stalagmight](https://github.com/Stalagmight/Stalagmight) (AGPL-3.0)

Stalagmight imports mNemo DMP, Ariane, Compass, Walls and GPX data. It offers
visual survey editing, loop closure, dive and gas planning, and collaboration
through SpeleoDB, and exports SVG, PNG and PDF maps plus CSV, JSON and Ariane TML.
EOF
gh api -X PUT repos/Stalagmight/.github/contents/profile/README.md \
  -f message='Add the organisation profile' \
  -f content="$(base64 -w0 /tmp/org-profile-README.md)"
```

On macOS use `base64 -i /tmp/org-profile-README.md` instead of `base64 -w0 …`.

## 7. Verify the Pages domain (optional, security)

Not about search: it stops anyone else from claiming `stalagmight.com` for
their own GitHub Pages site if this repo's Pages setting is ever removed. It
needs DNS access too.

<https://github.com/organizations/Stalagmight/settings/pages> → **Add a
domain** → `stalagmight.com`. GitHub shows a TXT record
(`_github-pages-challenge-stalagmight.stalagmight.com`); add it in Cloudflare
DNS, then click **Verify**.

## Check it worked

```bash
gh api repos/Stalagmight/Stalagmight --jq '{description, homepage, topics}'
gh api orgs/Stalagmight --jq '{name, description, blog}'
gh api repos/Stalagmight/.github/contents/profile/README.md --jq .path   # if you did step 6
```

Steps 3 and 5 are visible on the repo and org pages.
