import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useInspectorStore } from "@/stores/inspector";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Inspector Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // ── 初始狀態 ──────────────────────────────────────────────────────────────

  describe("初始狀態", () => {
    it("isOpen 應為 false", () => {
      const inspectorStore = useInspectorStore();
      expect(inspectorStore.isOpen).toBe(false);
    });
  });

  // ── Panel 開關操作 ────────────────────────────────────────────────────────

  describe("Panel 開關操作", () => {
    it("toggle()：false → true", () => {
      const inspectorStore = useInspectorStore();
      inspectorStore.toggle();
      expect(inspectorStore.isOpen).toBe(true);
    });

    it("toggle()：true → false", () => {
      const inspectorStore = useInspectorStore();
      inspectorStore.isOpen = true;
      inspectorStore.toggle();
      expect(inspectorStore.isOpen).toBe(false);
    });

    it("open()：isOpen 應為 true", () => {
      const inspectorStore = useInspectorStore();
      inspectorStore.open();
      expect(inspectorStore.isOpen).toBe(true);
    });

    it("open() 重複呼叫：isOpen 仍保持 true", () => {
      const inspectorStore = useInspectorStore();
      inspectorStore.open();
      inspectorStore.open();
      expect(inspectorStore.isOpen).toBe(true);
    });

    it("close()：isOpen 應為 false", () => {
      const inspectorStore = useInspectorStore();
      inspectorStore.isOpen = true;
      inspectorStore.close();
      expect(inspectorStore.isOpen).toBe(false);
    });

    it("close() 在已關閉狀態呼叫：isOpen 仍為 false", () => {
      const inspectorStore = useInspectorStore();
      inspectorStore.close();
      expect(inspectorStore.isOpen).toBe(false);
    });
  });
});
