import { ref } from "vue";
import { defineStore } from "pinia";
import { useSeoStore } from "@/stores/seo";
import type { Article } from "@/types";
import type { SEOGenerationResult } from "@/main/services/AIProvider/types";

export const useAIPanelStore = defineStore("aiPanel", () => {
  const isOpen = ref(false);

  // SEO Section 狀態
  const seoResult = ref<SEOGenerationResult | null>(null);
  const seoError = ref<string | null>(null);

  function toggle() {
    isOpen.value = !isOpen.value;
  }

  function open() {
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
  }

  /**
   * 生成 SEO 資訊。
   * 接受外部傳入 article，避免 store 內部直接呼叫 useArticleStore（降低耦合）。
   */
  async function generateSEO(article: Article) {
    const seoStore = useSeoStore();

    seoResult.value = null;
    seoError.value = null;

    const result = await seoStore.generateSEO(article);
    if (result) {
      seoResult.value = result;
    } else {
      seoError.value = seoStore.error ?? "生成失敗";
    }
  }

  /**
   * 將目前 SEO 結果套用至文章並回傳更新後的文章物件。
   * 由呼叫端負責呼叫 articleStore.updateArticleInMemory()，降低 store 耦合。
   */
  function applySEOResult(article: Article): Article | null {
    if (!seoResult.value) {
      return null;
    }

    return {
      ...article,
      frontmatter: {
        ...article.frontmatter,
        slug: seoResult.value.slug,
        description: seoResult.value.metaDescription,
        keywords: seoResult.value.keywords,
      },
    };
  }

  function clearSEO() {
    seoResult.value = null;
    seoError.value = null;
  }

  return {
    isOpen,
    seoResult,
    seoError,
    toggle,
    open,
    close,
    generateSEO,
    applySEOResult,
    clearSEO,
  };
});
