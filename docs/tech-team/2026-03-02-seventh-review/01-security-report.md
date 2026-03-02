# 資安評估報告 — 第七次全面評估

**評審者**: Sec（資安工程師）  
**評審日期**: 2026-03-02  
**評審範圍**: 全程式碼庫（main process、preload、renderer services）

---

## 一、前次問題確認（S6 → 已修復）

| S6 ID | 描述 | 修復確認 |
|-------|------|---------|
| S6-01 | ProcessService `shell:true` 命令注入 | ✅ 改為 `pnpm.cmd` 直呼，無 shell 代理 |
| S6-02 | ConfigService safeStorage 靜默 base64 降級 | ✅ setApiKey 改為 fail-close，未加密拒絕儲存 |
| S6-03/04 | 路徑白名單缺口（imagesDir / FileWatch / fail-open）| ✅ FileService.validatePath 白名單空時一律拒絕 |
| S6-06 | AI_SET_API_KEY provider 無 runtime 驗證 | ✅ VALID_AI_PROVIDERS 常數陣列白名單驗證 |
| S6-07 | ImageService sourcePath 未受白名單保護 | ✅ importExternalFile 只驗證 targetPath |
| S6-08 | Dev CSP unsafe-inline | ✅ 已接受（Dev 模式設計) |

---

## 二、本次新發現

### S7-01 🟠 — GitService.repoPath 無路徑白名單驗證

**嚴重性**: CVSS 6.3（本地利用，路徑洩漏 / 任意 Git 操作）  
**位置**: `src/main/services/GitService.ts`（全部方法）  
**注意**: `registerIpcHandlers.ts` Line 75-84 直接把 renderer 傳入的 `repoPath` 轉送給 GitService，GitService 沒有任何路徑驗證。

**攻擊情境**:
```
// Renderer 可以呼叫：
await window.electronAPI.gitStatus("/etc")
await window.electronAPI.gitAddCommitPush("/tmp/evil-repo", "malicious message")
```

`execFileAsync("git", [...], { cwd: repoPath })` 的 `cwd` 是 user-controlled，git 可以：
- `git status /etc`（路徑枚舉，洩露位置資訊）
- `git log —all`（以任意路徑作為 git 倉庫）
- 若有人在系統某處建立 `.git`，可能取得提交記錄

**建議修復**:
```typescript
// GitService 加入 allowedRepoPaths: string[]（類似 FileService.allowedBasePaths）
// registerIpcHandlers 的 GIT_* handler 在呼叫前先驗證 repoPath
// 白名單來源：config.paths.targetBlog（唯一合法 git repo）
```

**業務確認**: GitService 操作的對象永遠是 `targetBlog`（Astro Blog 目錄），不應允許任意路徑。

---

### S7-02 🟡 — ConfigService.getApiKey 加密降級靜默返回亂碼

**嚴重性**: CVSS 3.7（功能失效但不暴露資料）  
**位置**: `src/main/services/ConfigService.ts`，`getApiKey()` 方法

**問題**:
```typescript
if (safeStorage.isEncryptionAvailable()) {
  return safeStorage.decryptString(Buffer.from(encoded, "base64"));
} else {
  return Buffer.from(encoded, "base64").toString("utf-8"); // ← 把加密後的 bytes 當 UTF-8 解讀
}
```

當 `setApiKey` 時加密可用（正確儲存加密值），但 `getApiKey` 時加密不可用（例如系統更新後 Keychain 暫時不可用），會返回亂碼字串，導致 API 呼叫以錯誤 Key 靜默失敗，而 `hasApiKey()` 仍返回 `true`（因為 key 值非 null），造成 UI 顯示「Key 已設定」但呼叫永遠失敗。

**建議修復**:
```typescript
getApiKey(provider: ...): string | null {
  try {
    // ...
    if (!safeStorage.isEncryptionAvailable()) {
      logger.warn(`getApiKey: 加密不可用，拒絕返回可能已損毀的 Key`);
      return null; // 讓呼叫方看到「無 Key」狀態
    }
    return safeStorage.decryptString(Buffer.from(encoded, "base64"));
  } catch { return null; }
}
```

---

### S7-03 🟢 — AppConfigSchema path 驗證無路徑格式約束

**嚴重性**: CVSS 2.1（輸入驗證不完整）  
**位置**: `src/main/schemas/config.schema.ts`

`z.string().min(1)` 只確保非空，但允許像 `"."` 或 `"../../etc"` 這類路徑通過 Zod 驗證（最終由 FileService 攔截）。Zod 層作為第一道防線，應儘早拒絕明顯的異常路徑。

**建議**: 加入 `z.string().refine(p => path.isAbsolute(p), "路徑必須為絕對路徑")`  
**評估**: 低優先，因 FileService.validatePath 已作為縱深防禦，但 Zod 提前拒絕可提升錯誤訊息品質。

---

## 三、維持現況項目

| ID | 說明 | 決策 |
|----|------|------|
| S6-05 | `sandbox: false`（preload 需要 Node.js API）| ✅ 接受現況，已有技術文件支撐 |
| importExternalFile sourcePath | 圖片拖放需要允許外部路徑 | ✅ 設計正確，已有注解說明 |

---

## 四、整體安全評分（本次）

| 面向 | Q6 | Q7 | 變化 |
|------|----|----|------|
| 路徑穿越防護 | B+ | A- | ↑（GitService 是唯一缺口） |
| XSS 防護 | A | A | = |
| 命令注入防護 | A | A | = |
| API Key 儲存 | B | B+ | ↑（降級場景更清楚） |
| IPC 輸入驗證 | A- | A- | = |

**整體安全基線**: 良好，但 GitService 路徑驗證缺失（S7-01）是本次最高優先的可行漏洞，應在下一個 Sprint 修復。
