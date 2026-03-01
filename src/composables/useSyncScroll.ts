import { ref, type Ref } from "vue"

/**
 * 編輯器與預覽面板同步滾動 Composable
 * 
 * 根據編輯器的滾動位置，同步預覽面板的滾動
 */
export function useSyncScroll(
  editorRef: Ref<HTMLTextAreaElement | undefined>,
  previewRef: Ref<HTMLElement | undefined>
) {
  const syncEnabled = ref(true)
  const isScrollingFromEditor = ref(false)
  const isScrollingFromPreview = ref(false)
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null

  /**
   * 編輯器滾動時同步預覽面板
   */
  function onEditorScroll() {
    if (!syncEnabled.value || !editorRef.value || !previewRef.value) {
      return
    }

    // 避免相互觸發
    if (isScrollingFromPreview.value) {
      return
    }

    isScrollingFromEditor.value = true

    const editor = editorRef.value
    const preview = previewRef.value

    // 計算滾動百分比
    const scrollableHeight = editor.scrollHeight - editor.clientHeight
    
    if (scrollableHeight <= 0) {
      // 編輯器內容不足以滾動
      preview.scrollTop = 0
      return
    }

    const scrollPercentage = editor.scrollTop / scrollableHeight

    // 應用到預覽面板
    const previewScrollableHeight = preview.scrollHeight - preview.clientHeight
    preview.scrollTop = scrollPercentage * previewScrollableHeight

    // 延遲重置標誌，避免過快切換
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
    scrollTimeout = setTimeout(() => {
      isScrollingFromEditor.value = false
    }, 50)
  }

  /**
   * 預覽面板滾動時同步編輯器（可選）
   */
  function onPreviewScroll() {
    if (!syncEnabled.value || !editorRef.value || !previewRef.value) {
      return
    }

    // 避免相互觸發
    if (isScrollingFromEditor.value) {
      return
    }

    isScrollingFromPreview.value = true

    const editor = editorRef.value
    const preview = previewRef.value

    // 計算滾動百分比
    const scrollableHeight = preview.scrollHeight - preview.clientHeight
    
    if (scrollableHeight <= 0) {
      // 預覽面板內容不足以滾動
      editor.scrollTop = 0
      return
    }

    const scrollPercentage = preview.scrollTop / scrollableHeight

    // 應用到編輯器
    const editorScrollableHeight = editor.scrollHeight - editor.clientHeight
    editor.scrollTop = scrollPercentage * editorScrollableHeight

    // 延遲重置標誌，避免過快切換
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
    scrollTimeout = setTimeout(() => {
      isScrollingFromPreview.value = false
    }, 50)
  }

  /**
   * 切換同步滾動
   */
  function toggleSync() {
    syncEnabled.value = !syncEnabled.value
  }

  /**
   * 設定同步滾動狀態
   */
  function setSync(enabled: boolean) {
    syncEnabled.value = enabled
  }

  return {
    syncEnabled,
    onEditorScroll,
    onPreviewScroll,
    toggleSync,
    setSync
  }
}
