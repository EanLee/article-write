/**
 * Electron 環境工具函式
 *
 * 集中管理 Electron 環境的可用性檢查，
 * 避免在各個模組中重複撰寫相同的環境判斷邏輯。
 *
 * SOLID6-10: 解決 article store 重複出現 5 次環境檢查的問題
 */

/**
 * 檢查 Electron API 是否可用
 * @returns 是否在 Electron 環境中且 API 已初始化
 */
export function isElectronAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.electronAPI);
}

/**
 * 確保 Electron API 可用，否則拋出錯誤
 * 適合用於必須在 Electron 環境執行的操作
 * @throws Error 如果不在 Electron 環境中
 */
export function assertElectronAvailable(): void {
  if (!isElectronAvailable()) {
    throw new Error("Electron API not available");
  }
}
