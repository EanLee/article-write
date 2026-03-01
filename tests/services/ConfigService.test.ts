/**
 * QUAL6-04: ConfigService 測試
 * 覆蓋 src/main/services/ConfigService.ts 的關鍵行為：
 *   - getConfig() 在設定檔不存在時回傳預設值
 *   - setConfig() / getConfig() 讀寫循環
 *   - setApiKey() fail-close（加密不可用時拒絕儲存）
 *   - setApiKey() / getApiKey() 加密儲存循環
 *   - hasApiKey() 正確反映 key 是否存在
 *
 * 測試策略：
 *   vi.mock("electron") 隔離 Electron APIs（app.getPath、safeStorage）→ 使用
 *   os.tmpdir() 子目錄做實際檔案 I/O，讓邏輯分支完整覆蓋。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import os from "os";

// ─── Electron Mock ─────────────────────────────────────────────────────────────

let mockEncryptionAvailable = true;
const mockUserDataPath = join(os.tmpdir(), `config-test-${Date.now()}`);

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) => {
      if (name === "userData") {return mockUserDataPath;}
      return os.tmpdir();
    },
  },
  safeStorage: {
    isEncryptionAvailable: () => mockEncryptionAvailable,
    // 使用 base64 模擬加密（測試環境不需要真實加密）
    encryptString: (text: string) => Buffer.from(`enc:${text}`),
    decryptString: (buf: Buffer) => buf.toString("utf-8").replace(/^enc:/, ""),
  },
}));

// ─── 動態匯入（必須在 mock 之後）──────────────────────────────────────────────

const { ConfigService } = await import("@/main/services/ConfigService");

// ─── 測試 ─────────────────────────────────────────────────────────────────────

describe("ConfigService", () => {
  let service: InstanceType<typeof ConfigService>;

  beforeEach(async () => {
    mockEncryptionAvailable = true;
    // 確保測試目錄存在且為空
    await fs.mkdir(mockUserDataPath, { recursive: true });
    // 清除設定檔
    try {
      await fs.unlink(join(mockUserDataPath, "config.json"));
    } catch { /* not found, fine */ }
    try {
      await fs.unlink(join(mockUserDataPath, "ai-keys.json"));
    } catch { /* not found, fine */ }
    service = new ConfigService();
  });

  afterEach(async () => {
    // 清理測試目錄
    try {
      await fs.rm(mockUserDataPath, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  // ─── getConfig ─────────────────────────────────────────────────────────────

  describe("getConfig()", () => {
    it("設定檔不存在時，回傳預設設定", async () => {
      const config = await service.getConfig();

      expect(config.paths.articlesDir).toBe("");
      expect(config.paths.targetBlog).toBe("");
      expect(config.paths.imagesDir).toBe("");
      expect(config.editorConfig.autoSave).toBe(true);
      expect(config.editorConfig.autoSaveInterval).toBe(30000);
      expect(config.editorConfig.theme).toBe("light");
    });
  });

  // ─── setConfig / getConfig ─────────────────────────────────────────────────

  describe("setConfig() + getConfig()", () => {
    it("寫入設定後，可正確讀回", async () => {
      const config = {
        paths: { articlesDir: "/vault", targetBlog: "/blog", imagesDir: "/images" },
        editorConfig: { autoSave: false, autoSaveInterval: 60000, theme: "dark" as const },
      };

      await service.setConfig(config);
      const loaded = await service.getConfig();

      expect(loaded.paths.articlesDir).toBe("/vault");
      expect(loaded.paths.targetBlog).toBe("/blog");
      expect(loaded.paths.imagesDir).toBe("/images");
      expect(loaded.editorConfig.autoSave).toBe(false);
      expect(loaded.editorConfig.theme).toBe("dark");
    });
  });

  // ─── setApiKey — fail-close (S6-02) ───────────────────────────────────────

  describe("setApiKey() — fail-close 安全行為", () => {
    it("加密不可用時，應拋出錯誤，拒絕以明文儲存", () => {
      mockEncryptionAvailable = false;

      expect(() => service.setApiKey("openai", "sk-test-key")).toThrow("系統加密功能不可用");
    });

    it("加密不可用時，不應建立 ai-keys.json", async () => {
      mockEncryptionAvailable = false;

      try {
        service.setApiKey("openai", "sk-test-key");
      } catch { /* expected */ }

      // 驗證檔案未被建立
      await expect(fs.access(join(mockUserDataPath, "ai-keys.json"))).rejects.toThrow();
    });
  });

  // ─── setApiKey / getApiKey / hasApiKey ─────────────────────────────────────

  describe("setApiKey() + getApiKey() + hasApiKey()", () => {
    it("加密可用時，可寫入並正確讀回 API key", () => {
      service.setApiKey("openai", "sk-test-key");
      const key = service.getApiKey("openai");

      expect(key).toBe("sk-test-key");
    });

    it("不同 provider 的 key 互相獨立", () => {
      service.setApiKey("openai", "openai-key");
      service.setApiKey("claude", "claude-key");

      expect(service.getApiKey("openai")).toBe("openai-key");
      expect(service.getApiKey("claude")).toBe("claude-key");
    });

    it("hasApiKey() 在 key 存在時回傳 true", () => {
      service.setApiKey("gemini", "gemini-key");

      expect(service.hasApiKey("gemini")).toBe(true);
    });

    it("hasApiKey() 在 key 不存在時回傳 false", () => {
      expect(service.hasApiKey("openai")).toBe(false);
    });

    it("getApiKey() 在 provider 不存在時回傳 null", () => {
      expect(service.getApiKey("claude")).toBeNull();
    });

    it("覆寫 key 後讀取到最新值", () => {
      service.setApiKey("openai", "key-v1");
      service.setApiKey("openai", "key-v2");

      expect(service.getApiKey("openai")).toBe("key-v2");
    });
  });

  // ─── validateArticlesDir ────────────────────────────────────────────────────

  describe("validateArticlesDir()", () => {
    it("路徑不存在時，回傳 valid: false", async () => {
      const result = await service.validateArticlesDir("/absolutely/non-existent-path/for-testing");

      expect(result.valid).toBe(false);
      expect(result.message).toBe("無法存取路徑");
    });

    it("路徑存在且可讀寫時，回傳 valid: true", async () => {
      const result = await service.validateArticlesDir(os.tmpdir());

      expect(result.valid).toBe(true);
      expect(result.message).toContain("✓");
    });
  });
});
