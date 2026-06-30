#!/usr/bin/env node
// scripts/docs-lint.mjs — docs/ 全量 frontmatter 合法性檢查
//
// 在 VitePress dev/build 之前執行，把「啟動→崩潰→看 stack trace→定位」的高成本迴圈
// 縮短為「跑一次 lint→拿到清單→批次修正」（見 IRR-2026-06-08-consumer-doc-frontmatter-*）。
//
// 用法：
//   node scripts/docs-lint.mjs                   # 掃 <repo-root>/docs（doc-viewer 自用）
//   node scripts/docs-lint.mjs ../docs           # 掃指定路徑（自我封裝工具鏈情境，見 AIDR-003）
//   node scripts/docs-lint.mjs ../docs --schema  # 同上，額外檢查 doc-viewer schema 必填欄位
//
// 離開碼：
//   0 — 全部通過
//   1 — 至少一份文件有問題（可用來阻擋 docs:dev / docs:build 啟動）

import { parse as yamlParse } from 'yaml'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, relative, resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const docsArg = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1])
const DOCS_DIR = docsArg ? resolve(process.cwd(), docsArg) : join(ROOT, 'docs')
const CHECK_SCHEMA = process.argv.includes('--schema')

// doc-viewer 自訂 schema 的必填欄位（見 CLAUDE.md「Frontmatter 必填欄位」）
const REQUIRED_FIELDS = ['doc_type', 'doc_id', 'title', 'status', 'bounded_context', 'version', 'created_at']

// doc-viewer 內建的標準 doc_type 清單（見 GUIDELINE-doc-templates.md）
const KNOWN_DOC_TYPES = new Set([
  'ULR', 'BCD',               // domain
  'BRS', 'SBE',               // product
  'ADR', 'TDR',               // engineering
  'GUIDELINE',                // conventions
  'RUNBOOK',                  // operations
  'IRR', 'BACKLOG',           // quality / delivery
  'AIDR', 'RPD',              // discussions
  'CHANGE', 'FIX',            // delivery — 計畫性變更 / 缺陷驅動修正
])

async function loadProjectConfig() {
  const configPath = join(__dirname, '..', 'config.mjs')
  if (!existsSync(configPath)) return { extraDocTypes: new Set() }

  try {
    const cfg = await import(pathToFileURL(configPath).href)
    const extra = cfg.default?.extraDocTypes
    if (!Array.isArray(extra)) return { extraDocTypes: new Set() }
    return { extraDocTypes: new Set(extra.map(String)) }
  } catch (e) {
    console.warn(`[docs-lint] ⚠ 無法載入 .doc-viewer/config.mjs：${e.message}`)
    return { extraDocTypes: new Set() }
  }
}

const projectConfig = await loadProjectConfig()
const ALLOWED_DOC_TYPES = new Set([...KNOWN_DOC_TYPES, ...projectConfig.extraDocTypes])

const EXCLUDE_DIRS = new Set(['.vitepress', 'node_modules', '.git'])
const EXCLUDE_FILES = new Set(['index.md', 'README.md'])

// 嘗試萃取 frontmatter 區塊，回傳 { raw: string, startLine: number } 或 null（沒有 frontmatter）
function extractFrontmatter(content) {
  if (!content.startsWith('---')) return null
  const eol = content.indexOf('\n')
  if (eol === -1) return null
  const end = content.indexOf('\n---', eol)
  if (end === -1) return null
  const raw = content.slice(eol + 1, end)
  return { raw, startLine: 2 }
}

// 常見問題轉成人類可讀的提示
function humanizeYamlError(errorMsg, raw) {
  // 兩種 YAML 解析器都可能報的「值含裸冒號」錯誤（js-yaml / yaml v2 措辭不同）
  if (/incomplete explicit mapping|key node is missed|Nested mappings are not allowed|mapping key.*not allowed/i.test(errorMsg)) {
    const lines = raw.split('\n')
    // 找出值本身（引號外）包含 ": "（冒號+空白）的欄位行
    const culprit = lines.find((l) => {
      const m = l.match(/^(\s*\w[\w-]*):\s+(.*)$/)
      if (!m) return false
      const val = m[2]
      return !val.startsWith('"') && !val.startsWith("'") && /:\s/.test(val)
    })
    if (culprit) {
      const key = culprit.split(':')[0].trim()
      const val = culprit.split(':').slice(1).join(':').trim()
      return `欄位 "${key}" 的值含未加引號的冒號 ":"，YAML 解析器將其誤判為巢狀 key。\n         修正方式：加上雙引號，例如 ${key}: "${val}"`
    }
    return '某欄位的值含裸冒號 ":"，請加上雙引號括住整個值。'
  }
  if (/tab characters/i.test(errorMsg)) {
    return 'frontmatter 縮排含有 Tab 字元（YAML 只接受空白鍵縮排）。'
  }
  if (/unexpected end|end of the stream/i.test(errorMsg)) {
    return 'frontmatter 結尾分隔線 `---` 可能缺少換行，或引號未關閉。'
  }
  return errorMsg
}

const issues = []
let total = 0

function scanDir(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) scanDir(join(dir, entry.name))
      continue
    }
    if (!entry.name.endsWith('.md') || EXCLUDE_FILES.has(entry.name)) continue

    const absPath = join(dir, entry.name)
    const relPath = relative(DOCS_DIR, absPath).replace(/\\/g, '/')
    total++

    const content = readFileSync(absPath, 'utf-8')
    const fm = extractFrontmatter(content)

    if (!fm) continue // 沒有 frontmatter：不強制要求，僅 --schema 才會報錯

    // 層級一：YAML 語法合法性（最根本，失敗時不繼續 schema 檢查）
    let parsed
    try {
      parsed = yamlParse(fm.raw)
    } catch (e) {
      issues.push({
        file: relPath,
        line: fm.startLine,
        level: 'error',
        msg: humanizeYamlError(e.message, fm.raw),
        raw: e.message,
      })
      continue
    }

    if (!parsed || typeof parsed !== 'object') continue

    // 層級二：doc-viewer schema 必填欄位 + doc_type 值驗證（僅 --schema 模式）
    if (CHECK_SCHEMA) {
      for (const field of REQUIRED_FIELDS) {
        if (parsed[field] === undefined || parsed[field] === null || parsed[field] === '') {
          issues.push({
            file: relPath,
            line: fm.startLine,
            level: 'warn',
            msg: `缺少必填欄位 "${field}"（doc-viewer schema，見 CLAUDE.md）`,
            raw: `missing field: ${field}`,
          })
        }
      }

      const docType = parsed['doc_type']
      if (docType && !ALLOWED_DOC_TYPES.has(String(docType))) {
        const hint = projectConfig.extraDocTypes.size > 0
          ? '若為自訂類型，請確認已在 .doc-viewer/config.mjs 的 extraDocTypes 加入。'
          : '若為專案自訂類型，可在 .doc-viewer/config.mjs 中加入 extraDocTypes 陣列。'
        issues.push({
          file: relPath,
          line: fm.startLine,
          level: 'warn',
          msg: `doc_type "${docType}" 不在已知清單中。${hint}`,
          raw: `unknown doc_type: ${docType}`,
        })
      }
    }
  }
}

scanDir(DOCS_DIR)

const errors = issues.filter((i) => i.level === 'error')
const warns = issues.filter((i) => i.level === 'warn')

if (issues.length === 0) {
  console.log(`✓ docs-lint 通過（掃描 ${total} 份文件，無問題）`)
  process.exit(0)
}

console.error(`\ndocs-lint 發現 ${errors.length} 個錯誤${warns.length ? `、${warns.length} 個警告` : ''}（共掃描 ${total} 份文件）：\n`)

for (const issue of issues) {
  const tag = issue.level === 'error' ? '❌ ERROR' : '⚠  WARN '
  console.error(`  ${tag}  ${issue.file}:${issue.line}`)
  console.error(`         ${issue.msg}`)
  console.error()
}

if (errors.length > 0) {
  console.error(`請先修正上列 ${errors.length} 個錯誤，再執行 docs:dev 或 docs:build。`)
  process.exit(1)
}

// 只有 warn（schema 缺欄）：警告但不阻斷
console.warn(`（以上警告不影響 VitePress 運作，但建議補齊 doc-viewer schema 欄位。）`)
process.exit(0)
