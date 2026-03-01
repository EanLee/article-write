import { fileWatchService } from "@/services/FileWatchService";

export interface FileEvent {
  event: string;
  path: string;
}

/**
 * useFileWatching — 檔案監聽生命週期管理 composable
 *
 * 職責（單一職責原則）：
 * - 管理 FileWatchService 的啟動 / 停止
 * - 管理訂閱清理，防止重複訂閱造成記憶體洩漏（P-01）
 * - 將原始事件轉發給外部提供的 onFileEvent callback
 *
 * 不負責：
 * - 判斷哪些路徑屬於文章（parseArticlePath）
 * - 操作文章狀態（articles ref）
 * - 通知使用者（notify）
 */
export function useFileWatching(options: { onFileEvent: (event: FileEvent) => void }) {
  const { onFileEvent } = options;

  /** 目前的取消訂閱函式，null 表示未啟動 */
  let unsubscribe: (() => void) | null = null;

  /**
   * 啟動檔案監聽
   * - 若先前已有監聽，先清理舊訂閱再重新訂閱
   *
   * @param vaultPath - 要監聽的 Vault 根目錄
   */
  async function start(vaultPath: string): Promise<void> {
    // 清除舊訂閱，防止重複訂閱（P-01）
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    await fileWatchService.startWatching(vaultPath);

    unsubscribe = fileWatchService.subscribe((event) => {
      onFileEvent(event);
    });

    console.log("[useFileWatching] 檔案監聽已啟動:", vaultPath);
  }

  /**
   * 停止檔案監聽並清理訂閱
   */
  function stop(): void {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
      console.log("[useFileWatching] 檔案監聽已停止");
    }
  }

  return { start, stop };
}
