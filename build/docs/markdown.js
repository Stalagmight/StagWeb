// Markdown for the user guide, rendered so the same file reads the same on
// GitHub and on the site:
//
// - heading ids come from github-slugger, so `page.md#some-heading` written
//   against GitHub's anchors lands on the same heading here;
// - GitHub's alert syntax (`> [!WARNING]`) becomes a callout;
// - links and images go through resolvers the caller puts on `env`, which is
//   where cross-references are checked and rewritten.
import MarkdownIt from 'markdown-it';
import GithubSlugger from 'github-slugger';
import { parseHTML } from 'linkedom';

const ALERTS = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' };
const ALERT_MARK = /^\[!(note|tip|important|warning|caution)\][ \t]*(?:\r?\n|$)/i;

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Runs before inline parsing, so the marker can be cut from the raw text.
function alerts(state) {
  const t = state.tokens;
  for (let i = 0; i < t.length - 2; i++) {
    if (t[i].type !== 'blockquote_open' || t[i + 1].type !== 'paragraph_open' || t[i + 2].type !== 'inline') continue;
    const m = ALERT_MARK.exec(t[i + 2].content);
    if (!m) continue;
    const kind = m[1].toLowerCase();
    const open = t[i];
    open.tag = 'div';
    open.attrJoin('class', `callout callout-${kind}`);
    for (let j = i + 1; j < t.length; j++) {
      if (t[j].type === 'blockquote_close' && t[j].level === open.level) { t[j].tag = 'div'; break; }
    }
    t[i + 2].content = t[i + 2].content.slice(m[0].length);
    if (!t[i + 2].content.trim()) t.splice(i + 1, 3);
    const title = new state.Token('html_block', '', 0);
    title.content = `<p class="callout-title">${ALERTS[kind]}</p>\n`;
    t.splice(i + 1, 0, title);
  }
}

function plainText(inline) {
  return (inline.children || []).map(c =>
    c.type === 'text' || c.type === 'code_inline' ? c.content
      : c.type === 'image' ? '' : '').join('');
}

// After inline parsing: ids for every heading, the outline, and the page's own
// leading H1, which becomes the title instead of a second heading.
function headings(state) {
  const env = state.env;
  const slugger = new GithubSlugger();
  env.headings = [];
  const t = state.tokens;
  for (let i = 0; i < t.length; i++) {
    if (t[i].type !== 'heading_open') continue;
    const text = plainText(t[i + 1]).trim();
    const id = slugger.slug(text);
    t[i].attrSet('id', id);
    t[i + 2].meta = { id, level: Number(t[i].tag.slice(1)) };
    env.headings.push({ level: Number(t[i].tag.slice(1)), text, id });
  }
  const first = t.findIndex(x => x.type !== 'html_block' || x.content.trim());
  if (first >= 0 && t[first].type === 'heading_open' && t[first].tag === 'h1') {
    env.leadTitle = plainText(t[first + 1]).trim();
    t.splice(first, 3);
  }
  // The first paragraph, for pages without a description.
  const p = t.findIndex(x => x.type === 'paragraph_open' && x.level === 0);
  env.firstParagraph = p >= 0 ? plainText(t[p + 1]).replace(/\s+/g, ' ').trim() : '';
}

export function createMarkdown() {
  const md = new MarkdownIt({ html: true, linkify: true });
  md.core.ruler.before('inline', 'gh_alerts', alerts);
  md.core.ruler.push('doc_headings', headings);

  const r = md.renderer.rules;

  // A permalink after the text of every h2-h4, as on a wiki.
  r.heading_close = (tokens, i) => {
    const { id, level } = tokens[i].meta || {};
    const anchor = id && level >= 2 && level <= 4
      ? `<a class="docs-anchor" href="#${esc(id)}" aria-label="Link to this section" data-pagefind-ignore>#</a>` : '';
    return `${anchor}</${tokens[i].tag}>\n`;
  };

  r.link_open = (tokens, i, opts, env, self) => {
    const tok = tokens[i];
    const res = env.resolveLink(tok.attrGet('href') || '');
    (env.linkStack ||= []).push(res);
    if (res.broken) return `<span class="docs-broken" title="${esc(res.broken)}">`;
    tok.attrSet('href', res.href);
    if (res.external) { tok.attrSet('target', '_blank'); tok.attrSet('rel', 'noopener noreferrer'); }
    return self.renderToken(tokens, i, opts);
  };
  r.link_close = (tokens, i, opts, env, self) => {
    const res = env.linkStack.pop();
    return res && res.broken ? '</span>' : self.renderToken(tokens, i, opts);
  };

  r.image = (tokens, i, opts, env, self) => {
    const tok = tokens[i];
    const alt = self.renderInlineAsText(tok.children, opts, env);
    const img = env.resolveImage(tok.attrGet('src') || '');
    if (img.broken) return `<span class="docs-broken" title="${esc(img.broken)}">${esc(alt)}</span>`;
    const title = tok.attrGet('title');
    const size = img.width ? ` width="${img.width}" height="${img.height}"` : '';
    return `<img src="${esc(img.src)}" alt="${esc(alt)}"${title ? ` title="${esc(title)}"` : ''}${size} loading="lazy" decoding="async">`;
  };

  r.table_open = () => '<div class="docs-table"><table>\n';
  r.table_close = () => '</table></div>\n';
  return md;
}

// Raw HTML is allowed in the Markdown (for <kbd>, <details> and the like), and
// the docs take contributions, so nothing executable survives.
export function sanitize(html) {
  const { document } = parseHTML(`<!doctype html><html><head></head><body>${html}</body></html>`);
  document.querySelectorAll('script, style, iframe, frame, object, embed, form, link, meta, base').forEach(n => n.remove());
  for (const el of document.body.querySelectorAll('*')) {
    for (const { name, value } of [...el.attributes]) {
      if (name.startsWith('on') || (/^(href|src|action|formaction|xlink:href)$/i.test(name) && /^\s*(javascript|vbscript|data):/i.test(value))) {
        el.removeAttribute(name);
      }
    }
  }
  return document.body.innerHTML;
}
