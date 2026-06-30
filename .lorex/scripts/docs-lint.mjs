#!/usr/bin/env node
// scripts/docs-lint.mjs — docs/ 全量 frontmatter 合法性檢查
//
// 在 VitePress dev/build 之前執行，把「啟動→崩潰→看 stack trace→定位」的高成本迴圈
// 縮短為「跑一次 lint→拿到清單→批次修正」（見 IRR-2026-06-08-consumer-doc-frontmatter-*）。
//
// 用法：
//   node scripts/docs-lint.mjs                   # 掃 <repo-root>/docs（doc-viewer 自用）
//   node scripts/docs-lint.mjs ../docs           # 掃指定路徑（自我封裝工具鏈情境，見 AIDR-003）
//   node scripts/docs-lint.mjs ../docs --schema  # 同上，額外檢查 doc-viewer schema（見 config.mjs 可選欄位）
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

// doc-viewer schema 必填層（普世最小集，見 AIDR-004）。其餘欄位（doc_type/source_of_truth/...）
// 屬於建議層，未填不報錯；可透過 config.mjs 的 requiredFields 覆寫。
const DEFAULT_REQUIRED_FIELDS = ['title', 'status']

// doc-viewer 內建的建議語意型別清單（見 GUIDELINE-doc-templates.md）。屬於開放詞彙，
// 此清單僅供 schemaStrict 模式下提示參考，不構成封閉列舉。
const DEFAULT_KNOWN_DOC_TYPES = new Set([
  'ULR', 'BCD',               // domain
  'BRS', 'SBE',               // product
  'ADR', 'TDR',               // engineering
  'GUIDELINE',                // conventions
  'RUNBOOK',                  // operations
  'IRR', 'BACKLOG',           // quality / delivery
  'AIDR', 'RPD',              // discussions
  'CHANGE', 'FIX',            // delivery — 計畫性變更 / 缺陷驅動修正
])

// config.mjs 可選欄位：
//   requiredFields  — 覆寫必填層欄位（預設 ['title','status']）
//   knownDocTypes   — 完全覆寫建議語意型別清單（預設為 DEFAULT_KNOWN_DOC_TYPES）
//   extraDocTypes   — 在 DEFAULT_KNOWN_DOC_TYPES 基礎上擴充（與 knownDocTypes 二者選一）
//   allowedStatuses — status 值檢查白名單（預設不檢查，留給專案自訂 status 詞彙）
//   schemaStrict    — 是否對「doc_type 存在但不在建議清單中」發出提示（預設 false：寬鬆）
async function loadProjectConfig() {
  const configPath = join(__dirname, '..', 'config.mjs')
  const defaults = {
    requiredFields: DEFAULT_REQUIRED_FIELDS,
    knownDocTypes: DEFAULT_KNOWN_DOC_TYPES,
    allowedStatuses: null,
    schemaStrict: false,
  }
  if (!existsSync(configPath)) return defaults

  try {
    const cfg = await import(pathToFileURL(configPath).href)
    const c = cfg.default ?? {}

    const requiredFields = Array.isArray(c.requiredFields)
      ? c.requiredFields.map(String)
      : defaults.requiredFields

    let knownDocTypes = defaults.knownDocTypes
    if (Array.isArray(c.knownDocTypes)) {
      knownDocTypes = new Set(c.knownDocTypes.map(String))
    } else if (Array.isArray(c.extraDocTypes)) {
      knownDocTypes = new Set([...DEFAULT_KNOWN_DOC_TYPES, ...c.extraDocTypes.map(String)])
    }

    const allowedStatuses = Array.isArray(c.allowedStatuses)
      ? new Set(c.allowedStatuses.map(String))
      : defaults.allowedStatuses

    const schemaStrict = typeof c.schemaStrict === 'boolean' ? c.schemaStrict : defaults.schemaStrict

    return { requiredFields, knownDocTypes, allowedStatuses, schemaStrict }
  } catch (e) {
    console.warn(`[docs-lint] ⚠ 無法載入 .lorex/config.mjs：${e.message}`)
    return defaults
  }
}

const projectConfig = await loadProjectConfig()

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

    // 層級二：doc-viewer schema 檢查（僅 --schema 模式）
    if (CHECK_SCHEMA) {
      // 必填層：預設僅 title/status，可由 config.mjs 的 requiredFields 覆寫
      for (const field of projectConfig.requiredFields) {
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

      // 建議層：doc_type 為開放詞彙，未填不報；填了但不在建議清單中時，
      // 預設不阻斷也不提示（schemaStrict 開啟才提示），避免封閉列舉拖累自訂分類專案。
      if (projectConfig.schemaStrict) {
        const docType = parsed['doc_type']
        if (docType && !projectConfig.knownDocTypes.has(String(docType))) {
          issues.push({
            file: relPath,
            line: fm.startLine,
            level: 'warn',
            msg: `doc_type "${docType}" 不在建議語意型別清單中（開放詞彙，僅供參考）。若為專案自訂型別，可在 .lorex/config.mjs 的 knownDocTypes 或 extraDocTypes 登記，或忽略此提示。`,
            raw: `unknown doc_type: ${docType}`,
          })
        }
      }

      // status 詞彙檢查為選配：未在 config.mjs 提供 allowedStatuses 時不檢查
      if (projectConfig.allowedStatuses) {
        const status = parsed['status']
        if (status && !projectConfig.allowedStatuses.has(String(status))) {
          issues.push({
            file: relPath,
            line: fm.startLine,
            level: 'warn',
            msg: `status "${status}" 不在專案設定的允許清單中（見 .lorex/config.mjs 的 allowedStatuses）。`,
            raw: `unknown status: ${status}`,
          })
        }
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
