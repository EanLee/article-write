/**
 * IPC channel 名稱常數
 *
 * 集中管理 main process 與 renderer process (preload) 之間所有頻道名稱，
 * 避免因字串拼錯而造成靜默性通訊失敗。
 *
 * 使用 `as const` 確保每個值都是字面型別，便於 TypeScript 靜態分析。
 */
export const IPC = {
  // ── File ─ invoke ──────────────────────────────────────────────────────────
  READ_FILE: "read-file",
  WRITE_FILE: "write-file",
  DELETE_FILE: "delete-file",
  COPY_FILE: "copy-file",
  READ_DIRECTORY: "read-directory",
  CREATE_DIRECTORY: "create-directory",
  GET_FILE_STATS: "get-file-stats",

  // ── File Watch ─ invoke ────────────────────────────────────────────────────
  START_FILE_WATCHING: "start-file-watching",
  STOP_FILE_WATCHING: "stop-file-watching",
  IS_FILE_WATCHING: "is-file-watching",

  // ── Config ─ invoke ───────────────────────────────────────────────────────
  GET_CONFIG: "get-config",
  SET_CONFIG: "set-config",
  VALIDATE_ARTICLES_DIR: "validate-articles-dir",
  VALIDATE_ASTRO_BLOG: "validate-astro-blog",

  // ── Publish ─ invoke ───────────────────────────────────────────────────────
  PUBLISH_ARTICLE: "publish-article",
  SYNC_ALL_PUBLISHED: "sync-all-published",

  // ── Dev Server ─ invoke ───────────────────────────────────────────────────
  START_DEV_SERVER: "start-dev-server",
  STOP_DEV_SERVER: "stop-dev-server",
  GET_SERVER_STATUS: "get-server-status",

  // ── Git ─ invoke ──────────────────────────────────────────────────────────
  GIT_STATUS: "git-status",
  GIT_ADD: "git-add",
  GIT_COMMIT: "git-commit",
  GIT_PUSH: "git-push",
  GIT_ADD_COMMIT_PUSH: "git-add-commit-push",
  GIT_LOG: "git-log",

  // ── UI ─ invoke ───────────────────────────────────────────────────────────
  SELECT_DIRECTORY: "select-directory",

  // ── Search ─ invoke ───────────────────────────────────────────────────────
  SEARCH_QUERY: "search:query",
  SEARCH_BUILD_INDEX: "search:build-index",

  // ── Auto-Update ─ invoke + push events ────────────────────────────────────
  INSTALL_UPDATE: "install-update",

  // ── AI ─ invoke ───────────────────────────────────────────────────────────
  AI_GENERATE_SEO: "ai:generate-seo",
  AI_SET_API_KEY: "ai:set-api-key",
  AI_GET_HAS_API_KEY: "ai:get-has-api-key",
  AI_GET_ACTIVE_PROVIDER: "ai:get-active-provider",

  // ── Push events：main → renderer ─────────────────────────────────────────
  EVENT_FILE_CHANGE: "file-change",
  EVENT_PUBLISH_PROGRESS: "publish-progress",
  EVENT_SYNC_PROGRESS: "sync-progress",
  EVENT_SERVER_LOG: "server-log",
  EVENT_UPDATE_AVAILABLE: "update-available",
  EVENT_UPDATE_DOWNLOADED: "update-downloaded",
} as const;

/** IPC channel 名稱的聯集型別（供需要明確型別的參數使用） */
export type IpcChannel = (typeof IPC)[keyof typeof IPC];
