# S6-03/04 修正：FileService 路徑白名單漏洞

**日期**: 2026-03-01  
**分類**: 安全性 (Security Review — S6-03, S6-04)  
**分支**: `fix/path-whitelist-gaps`

---

## 問題描述

### S6-03：validatePath fail-open（白名單為空時不限制）

`FileService.validatePath()` 當 `allowedBasePaths.length === 0` 時直接 `return`，允許所有路徑：

```typescript
// 修改前（安全漏洞）
if (this.allowedBasePaths.length === 0) {
  return;  // ← fail-open！任何路徑均可存取
}
```

`main.ts` 的 catch 區塊甚至明確記錄此行為：
```typescript
// 設定尚未建立時允許不設定（白名單將為空陣列，不限制存取）
```

**風險**：若 Renderer 在白名單初始化前（或刻意在設定刪除後）送出 IPC 請求，可讀取系統任意檔案，如 `/etc/passwd`、`~/.ssh/id_rsa`。

### S6-04a：startWatching 未驗證路徑

`startWatching(watchPath)` 未呼叫 `validatePath()`，攻擊者可監聽任意目錄：

```typescript
// 修改前
startWatching(watchPath, callback): void {
  this.stopWatching();   // ← 無路徑驗證
  this.watcher = watch(watchPath, ...);
}
```

### S6-04b：imagesDir 未加入白名單

`main.ts` 的兩處 `setAllowedPaths` 呼叫均只包含 `articlesDir` 和 `targetBlog`，**遺漏 `imagesDir`**。一旦 fail-close 修正生效，圖片操作（`checkImageExists`, `copyImage`, 等）會因路徑超出白名單而失敗。

---

## 根本原因

白名單機制設計時採 fail-open 作為初始化便利設計，但此設計在安全環境下不可接受。`imagesDir` 的遺漏則是疏忽。

---

## 解決方案

### 1. validatePath fail-close (S6-03)

```typescript
private validatePath(filePath: string): void {
  if (this.allowedBasePaths.length === 0) {
    // fail-close: 白名單未初始化時一律拒絕 (S6-03)
    throw new Error(`拒絕存取：檔案白名單尚未初始化，請先設定 vault 路徑`);
  }
  // ...
}
```

### 2. startWatching 加入驗證 (S6-04a)

```typescript
startWatching(watchPath, callback): void {
  // 驗證監聽路徑在白名單範圍內 (S6-04)
  this.validatePath(watchPath);
  this.stopWatching();
  // ...
}
```

### 3. imagesDir 加入白名單 (S6-04b)

```typescript
// 初始化時（main.ts）
fileService.setAllowedPaths([
  initialConfig?.paths?.articlesDir,
  initialConfig?.paths?.targetBlog,
  initialConfig?.paths?.imagesDir,   // ← 新增
]);

// 設定更新時（main.ts）
fileService.setAllowedPaths([
  config.paths.articlesDir,
  config.paths.targetBlog,
  config.paths.imagesDir,             // ← 新增
]);
```

### 4. catch 區塊更新

```typescript
} catch {
  // 設定尚未建立；白名單為空陣列，所有檔案操作將被 fail-close 拒絕
  // 直到使用者完成路徑設定為止
}
```

---

## 影響評估

| 情況 | 修改前 | 修改後 |
|------|--------|--------|
| 未設定 config（首次啟動） | 所有路徑均可存取 | 所有檔案操作被拒絕（預期：使用者尚未設定 vault） |
| 已設定 config，正常操作 | articlesDir/targetBlog 可存取，imagesDir **不受保護** | 三個目錄均受保護 |
| startWatching 任意路徑 | 允許監聽任意目錄 | 需在白名單內才能監聽 |

---

## 修改檔案

| 檔案 | 修改 |
|------|------|
| `src/main/services/FileService.ts` | `validatePath` fail-close（空白名單拋出）；`startWatching` 加入路徑驗證 |
| `src/main/main.ts` | 兩處 `setAllowedPaths` 加入 `imagesDir`；更新 catch 區塊說明 |
