# S6-02 修正：ConfigService safeStorage fail-close

**日期**: 2026-03-01  
**分類**: 安全性 (Security Review — S6-02)  
**分支**: `fix/config-safe-storage`

---

## 問題描述

`ConfigService.setApiKey()` 當 `safeStorage.isEncryptionAvailable()` 回傳 `false` 時，靜默改用 `Buffer.from(key).toString("base64")` 儲存——**base64 不是加密**，API Key 等同明文落地，任何可讀取該檔案的程序均可還原。

```typescript
// 修改前（安全漏洞）
if (safeStorage.isEncryptionAvailable()) {
  keys[provider] = safeStorage.encryptString(key).toString("base64")  // 加密
} else {
  keys[provider] = Buffer.from(key).toString("base64")  // ← 僅 base64，非加密！
}
```

---

## 根本原因

Fail-open 設計：加密失敗時退回到不安全替代方案，而非拒絕操作。

`safeStorage` 不可用的情境（罕見但真實存在）：
- Linux 無 `libsecret`（headless server）
- Keychain 鎖定或損壞
- 企業策略停用 Credential Manager

---

## 解決方案

**Fail-close**：加密不可用時拋出例外，拒絕儲存，並逐層向使用者告知。

### 修改層次

| 層次 | 修改 |
|------|------|
| `ConfigService.setApiKey` | 加密不可用時丟出 `Error`，移除 base64 fallback |
| `main.ts` IPC handler | 包裹 try/catch，回傳 `{ success, error? }` 而非 void |
| `electron.d.ts` | `aiSetApiKey` 回傳型別改為 `Promise<{ success: boolean; error?: string }>` |
| `AISettings.vue` | 讀取回傳值，失敗時顯示錯誤提示 |

---

## 修改細節

### ConfigService.ts

```typescript
setApiKey(provider, key): void {
  // fail-close：若加密不可用，拒絕儲存 (S6-02)
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      "系統加密功能不可用，拒絕以明文儲存 API Key。請確保 Keychain/Credential Manager 正常運作。"
    )
  }
  // ... 僅在加密可用時繼續
  keys[provider] = safeStorage.encryptString(key).toString("base64")
}
```

### main.ts

```typescript
ipcMain.handle(IPC.AI_SET_API_KEY, (_, provider, key) => {
  try {
    configService.setApiKey(provider, key);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
});
```

### AISettings.vue

```typescript
const result = await window.electronAPI.aiSetApiKey(provider, key)
if (!result.success) {
  statusMap[provider].value = "儲存失敗"
  alert(`儲存失敗: ${result.error ?? "系統加密不可用"}`)
  return
}
```

---

## 影響範圍

- `getApiKey()` 保留向後相容的 base64 fallback（讀取老資料），但寫入端不再允許
- 正常 macOS/Windows 使用者不受影響（safeStorage 幾乎必然可用）
- 異常環境（Linux headless）使用者將看到明確錯誤，而非靜默儲存不安全資料

---

## 修改檔案

| 檔案 | 修改 |
|------|------|
| `src/main/services/ConfigService.ts` | `setApiKey` fail-close guard |
| `src/main/main.ts` | IPC handler 包裹 try/catch，回傳結果物件 |
| `src/types/electron.d.ts` | `aiSetApiKey` 回傳型別更新 |
| `src/components/settings/AISettings.vue` | 錯誤回傳值處理 |
