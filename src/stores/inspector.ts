import { ref } from "vue";
import { defineStore } from "pinia";

export const useInspectorStore = defineStore("inspector", () => {
  // 依 IA Phase 3 子專案 1 spec 決策（docs/engineering/discussions/2026-08-04-ia-phase3-workspace-layout-inspector.md
  // 「Inspector 預設狀態」表列）：常駐可見、可折疊，明確不同於舊 AI 面板的預設關閉。
  const isOpen = ref(true);

  function toggle() {
    isOpen.value = !isOpen.value;
  }

  function open() {
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
  }

  return {
    isOpen,
    toggle,
    open,
    close,
  };
});
