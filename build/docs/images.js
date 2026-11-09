// Screenshots in the user guide are committed as full-size PNGs (1920 px app
// windows, up to ~1.4 MB each) and shown about 670 px wide. The build turns
// each raster image into WebP at 800 px and 1600 px for the page, plus one at
// its own size for the click-to-enlarge view. On the guide's screenshots that
// is 1372 KB -> 47 / 122 / 200 KB, with text indistinguishable at 2x zoom.
//
// Encodes are cached by content in node_modules/.cache, so the dev server's
// rebuild on every save does not re-encode anything that did not change.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RASTER = /\.(png|jpe?g|webp)$/i;
const WIDTHS = [800, 1600];
const PAGE_QUALITY = 82;
const FULL_QUALITY = 88;
const CACHE = path.resolve('node_modules/.cache/stalagmight-docs-images');

async function encode(buf, hash, width, quality) {
  const key = path.join(CACHE, `${hash}-${width}-q${quality}.webp`);
  if (fs.existsSync(key)) return fs.readFileSync(key);
  const out = await sharp(buf).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 5 }).toBuffer();
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(key, out);
  return out;
}

// For every raster image under `source`: writes the variants into
// `outDir/_files/` and returns rel -> { width, height, variants: [{ w, file }] },
// smallest first. `file` is relative to outDir.
export async function prepareImages(source, outDir, files) {
  const result = new Map();
  for (const rel of files.filter(f => RASTER.test(f))) {
    const buf = fs.readFileSync(path.join(source, rel));
    let meta;
    try { meta = await sharp(buf).metadata(); } catch { continue; }
    if (!meta.width || !meta.height) continue;
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    const base = rel.replace(RASTER, '');
    const sizes = [...WIDTHS.filter(w => w < meta.width).map(w => [w, PAGE_QUALITY]), [meta.width, FULL_QUALITY]];
    const variants = [];
    for (const [w, q] of sizes) {
      const file = `_files/${base}.${w}.webp`;
      const target = path.join(outDir, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, await encode(buf, hash, w, q));
      variants.push({ w, file });
    }
    result.set(rel, { width: meta.width, height: meta.height, variants });
  }
  return result;
}
