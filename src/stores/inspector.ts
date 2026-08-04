import { ref } from "vue";
import { defineStore } from "pinia";

export const useInspectorStore = defineStore("inspector", () => {
  const isOpen = ref(false);

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
