#!/usr/bin/env node
// scripts/generate-nav.mjs — 依 docs/ 目錄結構與 frontmatter 自動產生 VitePress nav/sidebar
//
// 背景：手寫 nav/sidebar 只能反映「單一專案當下的文件快照」，換一批文件組合就要重寫一次，
// 與 doc-viewer「範本＋工具」雙軌定位（可被其他專案複用）相衝突（見 AIDR-002）。
// 本腳本改為每次直接掃描 docs/ 現況產生結果，新增/搬移文件後重新執行即可同步，
// 不會再出現「決策（這裡是文件異動）沒有落實到 nav」的落差。
//
// 用法：node scripts/generate-nav.mjs
// 輸出：docs/.vitepress/nav.generated.mjs（由 config.mjs import 後展開使用）

import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { join, relative, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// 可選的第一個參數：docs 目錄的相對／絕對路徑（相對於執行時所在目錄解析）。
// 用於自我封裝的工具子目錄場景（見 AIDR-003）——該情境下 generate-nav.mjs
// 與 docs/ 不在同一個專案根目錄下，無法用 __dirname 推回 docs/ 位置。
// 不帶參數時維持原行為：以本腳本所在位置回推 <root>/docs（doc-viewer 自身用法）。
const docsArg = process.argv[2]
const DOCS_DIR = docsArg ? resolve(process.cwd(), docsArg) : join(ROOT, 'docs')
const OUT_FILE = join(DOCS_DIR, '.vitepress', 'nav.generated.mjs')

const EXCLUDE_DIRS = new Set(['.vitepress', 'node_modules', '.git'])
const EXCLUDE_FILES = new Set(['index.md', 'README.md'])

// 已知目錄的顯示名稱（doc-viewer 範本既定結構，見 CLAUDE.md，含常見子目錄縮寫）。
// 非清單內的目錄（例如其他專案自訂的分類）會直接使用目錄名稱當標題，不影響運作——
// 這份對照表是「錦上添花」，不是必要條件，刪掉也不會讓腳本壞掉。
const SECTION_LABELS = {
  // 頂層分類（中文站點不需要附英文原文——只會讓 nav 標籤變長、版面溢出）
  domain: '領域知識',
  product: '產品需求',
  engineering: '工程決策',
  conventions: '開發規範',
  guidelines: '開發規範',
  delivery: '交付計畫',
  quality: '品質管理',
  operations: '維運手冊',
  reference: '參考資料',
  discussions: 'AI 開發討論',
  notes: '備註',
  superpowers: 'Claude 工作流程',
  // 常見子目錄縮寫——這些英文縮寫本身就是專案慣用詞（見 CLAUDE.md），保留括號註記
  ulr: '通用語言登錄（ULR）',
  bcd: '領域邊界定義（BCD）',
  brs: '商業需求規格（BRS）',
  sbe: '實例化需求（SBE）',
  adr: '架構決策（ADR）',
  tdr: '技術選型（TDR）',
  assessments: '品質評估報告',
  incidents: '事件根因記錄（IRR）',
  plans: '計畫',
  specs: '規格',
}

// 從 frontmatter 區塊抓 title（只需要純量字串欄位，不引入 YAML 套件）
function readTitle(absPath) {
  const content = readFileSync(absPath, 'utf-8')
  if (!content.startsWith('---')) return null
  const end = content.indexOf('\n---', 3)
  if (end === -1) return null
  const frontmatter = content.slice(3, end)
  const match = frontmatter.match(/^title:\s*(.+)$/m)
  if (!match) return null
  return match[1].trim().replace(/^["']|["']$/g, '')
}

// 找不到 title 時的備援：把檔名轉成可讀字串（去日期前綴、底線/連字號轉空白）
function titleFromFilename(filename) {
  const base = filename.replace(/\.md$/, '')
  return base.replace(/^\d{4}-\d{2}(-\d{2})?-/, '').replace(/[-_]/g, ' ')
}

function labelForDir(dirname) {
  return SECTION_LABELS[dirname] ?? dirname
}

// 遞迴掃描單一目錄，回傳 VitePress sidebar 群組節點；該目錄（含子目錄）若完全沒有
// 可收錄的 .md 檔案則回傳 null，避免產生「分類底下空空如也」的死路（AIDR-002 點出的問題）
function buildGroup(absDir, relDir, label) {
  const entries = readdirSync(absDir, { withFileTypes: true })

  const subDirs = entries
    .filter((e) => e.isDirectory() && !EXCLUDE_DIRS.has(e.name))
    .map((e) => e.name)
    .sort()

  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && !EXCLUDE_FILES.has(e.name))
    .map((e) => e.name)
    .sort()

  const items = []

  for (const sub of subDirs) {
    const child = buildGroup(join(absDir, sub), join(relDir, sub), labelForDir(sub))
    if (child) items.push(child)
  }

  for (const file of files) {
    const absFile = join(absDir, file)
    const title = readTitle(absFile) ?? titleFromFilename(file)
    const link = '/' + relative(DOCS_DIR, absFile).replace(/\\/g, '/').replace(/\.md$/, '')
    items.push({ text: title, link })
  }

  if (items.length === 0) return null
  return { text: label, items, collapsed: true }
}

function buildSidebar() {
  const entries = readdirSync(DOCS_DIR, { withFileTypes: true })

  const topDirs = entries
    .filter((e) => e.isDirectory() && !EXCLUDE_DIRS.has(e.name))
    .map((e) => e.name)
    .sort()

  const looseFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && !EXCLUDE_FILES.has(e.name))
    .map((e) => e.name)
    .sort()

  const groups = []
  for (const dir of topDirs) {
    const group = buildGroup(join(DOCS_DIR, dir), dir, labelForDir(dir))
    if (group) groups.push(group)
  }

  // docs/ 根目錄下散落的 .md（非 index/README）也要收進去，避免被自動產生流程遺漏
  if (looseFiles.length > 0) {
    const items = looseFiles.map((file) => {
      const absFile = join(DOCS_DIR, file)
      const title = readTitle(absFile) ?? titleFromFilename(file)
      const link = '/' + file.replace(/\.md$/, '')
      return { text: title, link }
    })
    groups.push({ text: '其他文件', items, collapsed: true })
  }

  return groups
}

// 找一個分類群組底下「第一份」文件連結，作為該分類在 nav 上的進入點
// （buildGroup 已保證傳進來的群組至少有一個項目，不會是空分類）
function firstLink(node) {
  const first = node.items[0]
  return first.items ? firstLink(first) : first.link
}

// nav 的頂層分類項目各自連到「該分類底下第一份文件」，而不是展開成落落長的下拉選單。
// 這正是 AIDR-002 §2.1 一開始就指出的 IA 原則本身：
//   「主導覽＝穩定的頂層分類（讀者的進入點），側邊欄＝分類內的細節導覽」。
// 點進某個分類後，sidebar 自然接手該分類內的完整導覽，nav 不需要、也不應該重複那份清單。
//
// 這個設計同時修掉了一個曾經試錯出來的瑕疵：早先一版把 nav 砍到只剩「首頁」，
// 理由是「內容導覽交給 sidebar」——但實機驗證才發現 VitePress 的 `layout: home`
// 首頁根本不渲染 sidebar，首頁因此變成完全進不去任何內容的死路。
// 「每個分類一個進入連結」剛好同時解決「需要從任何頁面都能走進內容」與
// 「不要在 nav 重複 sidebar 的詳細清單」這兩個原本看似衝突的要求。
function buildNav(sidebarGroups) {
  const nav = [{ text: '首頁', link: '/' }]
  for (const group of sidebarGroups) {
    nav.push({ text: group.text, link: firstLink(group) })
  }
  return nav
}

const sidebar = buildSidebar()
const nav = buildNav(sidebar)

const banner = `// 本檔案由 \`node scripts/generate-nav.mjs\` 自動產生，請勿手動編輯。
// 新增、搬移或刪除 docs/ 下的文件後，重新執行該腳本即可同步 nav/sidebar。
`

const output = `${banner}
export const nav = ${JSON.stringify(nav, null, 2)}

export const sidebar = ${JSON.stringify(sidebar, null, 2)}
`

writeFileSync(OUT_FILE, output)
console.log(`OK  已產生 ${relative(ROOT, OUT_FILE)}`)
console.log(`    nav：首頁 + ${nav.length - 1} 個分類進入點（各連到該分類第一份文件）`)
console.log(`    sidebar：${sidebar.length} 個頂層分類，群組總數（含巢狀）：${countGroups(sidebar)}`)

function countGroups(groups) {
  let n = 0
  for (const g of groups) {
    n += 1
    n += countGroups(g.items.filter((i) => i.items))
  }
  return n
}
