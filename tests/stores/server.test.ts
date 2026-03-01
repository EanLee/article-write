import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useServerStore } from "@/stores/server";
import type { ServerStatusResult } from "@/types/electron";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockElectronAPI = {
  startDevServer: vi.fn(),
  stopDevServer: vi.fn(),
  getServerStatus: vi.fn(),
};

Object.defineProperty(window, "electronAPI", {
  value: mockElectronAPI,
  writable: true,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeServerStatusResult(overrides: Partial<ServerStatusResult> = {}): ServerStatusResult {
  return {
    running: false,
    url: undefined,
    logs: [],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Server Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ── 初始狀態 ──────────────────────────────────────────────────────────────

  describe("初始狀態", () => {
    it("應有正確的預設 status", () => {
      const store = useServerStore();
      expect(store.status.running).toBe(false);
      expect(store.status.url).toBeUndefined();
      expect(store.status.logs).toEqual([]);
    });

    it("loading 應預設為 false", () => {
      const store = useServerStore();
      expect(store.loading).toBe(false);
    });
  });

  // ── startServer() ─────────────────────────────────────────────────────────

  describe("startServer()", () => {
    it("應呼叫 startDevServer 並以 projectPath 為參數", async () => {
      mockElectronAPI.startDevServer.mockResolvedValueOnce(undefined);
      mockElectronAPI.getServerStatus.mockResolvedValueOnce(makeServerStatusResult({ running: true, url: "http://localhost:4321" }));
      const store = useServerStore();

      await store.startServer("/path/to/project");
      expect(mockElectronAPI.startDevServer).toHaveBeenCalledOnce();
      expect(mockElectronAPI.startDevServer).toHaveBeenCalledWith("/path/to/project");
    });

    it("成功後應呼叫 updateStatus 更新 status", async () => {
      mockElectronAPI.startDevServer.mockResolvedValueOnce(undefined);
      mockElectronAPI.getServerStatus.mockResolvedValueOnce(makeServerStatusResult({ running: true, url: "http://localhost:4321" }));
      const store = useServerStore();

      await store.startServer("/project");
      expect(store.status.running).toBe(true);
      expect(store.status.url).toBe("http://localhost:4321");
    });

    it("執行期間 loading 應為 true，完成後恢復 false", async () => {
      let resolveStart: () => void;
      const startPromise = new Promise<undefined>((r) => {
        resolveStart = () => r(undefined);
      });
      mockElectronAPI.startDevServer.mockReturnValueOnce(startPromise);
      mockElectronAPI.getServerStatus.mockResolvedValueOnce(makeServerStatusResult({ running: true }));
      const store = useServerStore();

      const call = store.startServer("/project");
      expect(store.loading).toBe(true);

      resolveStart!();
      await call;
      expect(store.loading).toBe(false);
    });

    it("API 拋出錯誤後應 rethrow，且 loading 恢復 false", async () => {
      mockElectronAPI.startDevServer.mockRejectedValueOnce(new Error("無法啟動伺服器"));
      const store = useServerStore();

      await expect(store.startServer("/project")).rejects.toThrow("無法啟動伺服器");
      expect(store.loading).toBe(false);
    });
  });

  // ── stopServer() ──────────────────────────────────────────────────────────

  describe("stopServer()", () => {
    it("應呼叫 stopDevServer", async () => {
      mockElectronAPI.stopDevServer.mockResolvedValueOnce(undefined);
      const store = useServerStore();

      await store.stopServer();
      expect(mockElectronAPI.stopDevServer).toHaveBeenCalledOnce();
    });

    it("停止後應重置 status 為初始值", async () => {
      mockElectronAPI.stopDevServer.mockResolvedValueOnce(undefined);
      const store = useServerStore();
      store.status.running = true;
      store.status.url = "http://localhost:4321";
      store.addLog("啟動日誌");

      await store.stopServer();
      expect(store.status.running).toBe(false);
      expect(store.status.url).toBeUndefined();
      expect(store.status.logs).toEqual([]);
    });

    it("執行期間 loading 應為 true，完成後恢復 false", async () => {
      let resolveStop: () => void;
      const stopPromise = new Promise<undefined>((r) => {
        resolveStop = () => r(undefined);
      });
      mockElectronAPI.stopDevServer.mockReturnValueOnce(stopPromise);
      const store = useServerStore();

      const call = store.stopServer();
      expect(store.loading).toBe(true);

      resolveStop!();
      await call;
      expect(store.loading).toBe(false);
    });

    it("API 拋出錯誤後應 rethrow，且 loading 恢復 false", async () => {
      mockElectronAPI.stopDevServer.mockRejectedValueOnce(new Error("無法停止伺服器"));
      const store = useServerStore();

      await expect(store.stopServer()).rejects.toThrow("無法停止伺服器");
      expect(store.loading).toBe(false);
    });
  });

  // ── updateStatus() ────────────────────────────────────────────────────────

  describe("updateStatus()", () => {
    it("應從 API 更新 running 和 url", async () => {
      mockElectronAPI.getServerStatus.mockResolvedValueOnce(makeServerStatusResult({ running: true, url: "http://localhost:4321" }));
      const store = useServerStore();

      await store.updateStatus();
      expect(store.status.running).toBe(true);
      expect(store.status.url).toBe("http://localhost:4321");
    });

    it("更新時應保留現有 logs（不被 API 結果覆蓋）", async () => {
      mockElectronAPI.getServerStatus.mockResolvedValueOnce(makeServerStatusResult({ running: true, url: "http://localhost:4321" }));
      const store = useServerStore();
      store.addLog("已有日誌");

      await store.updateStatus();
      expect(store.status.logs).toContain("已有日誌");
    });

    it("API 拋出錯誤時應靜默處理，不拋出", async () => {
      mockElectronAPI.getServerStatus.mockRejectedValueOnce(new Error("連線失敗"));
      const store = useServerStore();

      await expect(store.updateStatus()).resolves.toBeUndefined();
    });

    it("API 失敗後 status 應維持不變", async () => {
      mockElectronAPI.getServerStatus.mockRejectedValueOnce(new Error("連線失敗"));
      const store = useServerStore();

      await store.updateStatus();
      expect(store.status.running).toBe(false);
      expect(store.status.url).toBeUndefined();
    });
  });

  // ── addLog() ──────────────────────────────────────────────────────────────

  describe("addLog()", () => {
    it("應將日誌加入 status.logs", () => {
      const store = useServerStore();
      store.addLog("第一條日誌");
      expect(store.status.logs).toContain("第一條日誌");
    });

    it("多次呼叫應依序累積日誌", () => {
      const store = useServerStore();
      store.addLog("日誌 A");
      store.addLog("日誌 B");
      store.addLog("日誌 C");
      expect(store.status.logs).toEqual(["日誌 A", "日誌 B", "日誌 C"]);
    });

    it("超過 100 條時應截斷為最新的 100 條", () => {
      const store = useServerStore();
      for (let i = 0; i < 100; i++) {
        store.addLog(`日誌 ${i}`);
      }
      store.addLog("第 101 條日誌");

      expect(store.status.logs).toHaveLength(100);
      expect(store.status.logs![0]).toBe("日誌 1"); // 第 0 條被移除
      expect(store.status.logs![99]).toBe("第 101 條日誌");
    });

    it("logs 為 undefined 時應先初始化再加入", () => {
      const store = useServerStore();
      // 強制 logs 為 undefined 模擬邊緣情況
      (store.status as { logs: undefined }).logs = undefined as unknown as undefined;

      store.addLog("初始化後第一條");
      expect(store.status.logs).toEqual(["初始化後第一條"]);
    });
  });
});
