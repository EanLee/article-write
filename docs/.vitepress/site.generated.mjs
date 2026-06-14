// docs/.vitepress/site.generated.mjs — 由 doc-viewer-init 產生
//
// 注意：重新執行 doc-viewer-init 會覆寫本目錄下的 site.generated.mjs 與
// config.mjs（取得最新模板修正）。若已自訂 title / description，重跑後
// 記得重新填回 config.mjs。

import { nav, sidebar } from './nav.generated.mjs'

// ── 容錯渲染 ──────────────────────────────────────────────────────────────────
// VitePress 的 frontmatterPlugin 把 YAML 解析包在 md.render 裡。
// markdown.config(md) 在所有內建 plugin 加完後才執行，套一層 try-catch
// 即可將「整站崩潰」降級為「單頁顯示錯誤訊息」。
function wrapMarkdownRender(md) {
  const originalRender = md.render.bind(md)
  md.render = (src, env = {}) => {
    try {
      return originalRender(src, env)
    } catch (e) {
      if (e.name !== 'YAMLException') throw e
      const filename = env.relativePath ?? '（未知檔案）'
      env.frontmatter = { ...env.frontmatter, title: `⚠ frontmatter 錯誤：${filename}` }
      const hint = detectBareColonHint(src)
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const hintHtml = hint
        ? `<p><strong>修正方式：</strong>加上雙引號：<code>${esc(`${hint.key}: "${hint.val}"`)}</code></p>`
        : ''
      console.error(`\n[frontmatter-guard] ❌ YAML 解析失敗（${filename}）：${e.message}\n`)
      return [
        '<div class="custom-block danger">',
        '<p class="custom-block-title">⚠ 這份文件的 frontmatter 有 YAML 語法錯誤，無法正常載入</p>',
        `<pre><code>${esc(e.message)}</code></pre>`,
        hintHtml,
        '<p>執行 <code>npm run docs:lint</code> 取得完整清單與修正建議。</p>',
        '</div>',
      ].join('\n')
    }
  }
}
function detectBareColonHint(src) {
  const fm = src.match(/^---\r?\n([\s\S]*?)\n---/)
  if (!fm) return null
  for (const line of fm[1].split('\n')) {
    const m = line.match(/^(\s*[\w-]+):\s+(.*)$/)
    if (!m) continue
    const val = m[2].trim()
    if (/^["'{[|>]/.test(val)) continue
    if (/:\s/.test(val) || val.endsWith(':')) return { key: m[1].trim(), val }
  }
  return null
}
const frontmatterGuard = {
  name: 'vitepress-frontmatter-guard',
  enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('.md')) return null
    const fm = code.match(/^---\r?\n([\s\S]*?)\n---/)
    if (!fm) return null
    const hint = detectBareColonHint(code)
    if (!hint) return null
    return `---\ntitle: "⚠ frontmatter 錯誤"\n---` + code.slice(fm[0].length)
  },
}
// ── /容錯渲染 ─────────────────────────────────────────────────────────────────

export const siteConfig = (custom) => ({
  ...custom,
  lang: 'zh-TW',
  markdown: { config: wrapMarkdownRender },
  vite: { plugins: [frontmatterGuard] },
  themeConfig: {
    nav,

    search: {
      provider: 'local',
    },

    sidebar,
  },
})
