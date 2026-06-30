import type { Frontmatter } from "@/types";

/**
 * FrontmatterConverter
 *
 * 單一職責：負責將 Obsidian frontmatter 格式轉換為 Astro 相容的 frontmatter 格式。
 * 從 ConverterService 提取，解決 SRP 違反問題（SOLID5-01）。
 *
 * 轉換規則：
 * - 確保 `date` 欄位存在（預設使用今日日期）
 * - 更新 `lastmod` 為當前時間
 * - 確保 `tags` 和 `categories` 為陣列型別
 */
export class FrontmatterConverter {
  /**
   * 轉換 frontmatter 格式
   * @param frontmatter - 原始 Obsidian frontmatter 物件
   * @returns 轉換後符合 Astro 格式的 frontmatter 物件
   */
  convert(frontmatter: Frontmatter): Record<string, unknown> {
    const converted: Record<string, unknown> = { ...frontmatter };

    // 確保必要欄位存在
    if (!converted.date) {
      converted.date = this.todayString();
    }

    // 更新 lastmod 為當前時間
    converted.lastmod = this.todayString();

    // 確保 tags 是陣列
    if (!Array.isArray(converted.tags)) {
      converted.tags = [];
    }

    // 確保 categories 是陣列
    if (!Array.isArray(converted.categories)) {
      converted.categories = [];
    }

    return converted;
  }

  /** 回傳今日 ISO 日期字串（YYYY-MM-DD） */
  private todayString(): string {
    return new Date().toISOString().split("T")[0];
  }
}

/** 預設單例實例 */
export const frontmatterConverter = new FrontmatterConverter();
