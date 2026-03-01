import { describe, it, expect } from "vitest";
import { FrontmatterConverter } from "@/services/FrontmatterConverter";
import type { Frontmatter } from "@/types";

describe("FrontmatterConverter", () => {
  const converter = new FrontmatterConverter();

  // ── convert() ─────────────────────────────────────────────────────────────

  describe("convert(frontmatter)", () => {
    it("原始欄位完整複製（不破壞性轉換）", () => {
      const frontmatter: Frontmatter = {
        title: "測試文章",
        slug: "test-article",
        tags: ["tag1"],
        categories: ["tech"],
        date: "2024-01-01",
      };

      const result = converter.convert(frontmatter);

      expect(result.title).toBe("測試文章");
      expect(result.slug).toBe("test-article");
      expect(result.tags).toEqual(["tag1"]);
      expect(result.categories).toEqual(["tech"]);
    });

    it("無 date 欄位時：自動填入今日 ISO 日期", () => {
      const today = new Date().toISOString().split("T")[0];
      const frontmatter: Frontmatter = { title: "無日期文章" };

      const result = converter.convert(frontmatter);

      expect(result.date).toBe(today);
    });

    it("已有 date 欄位時：保留原始值不覆寫", () => {
      const frontmatter: Frontmatter = { title: "有日期文章", date: "2020-01-15" };

      const result = converter.convert(frontmatter);

      expect(result.date).toBe("2020-01-15");
    });

    it("lastmod 永遠更新為今日日期", () => {
      const today = new Date().toISOString().split("T")[0];
      const frontmatter: Frontmatter = { title: "文章", lastmod: "2020-01-01" };

      const result = converter.convert(frontmatter);

      expect(result.lastmod).toBe(today);
    });

    it("tags 非陣列時：自動初始化為空陣列", () => {
      // Frontmatter 型別中 tags 是可選的，測試 undefined
      const frontmatter: Frontmatter = { title: "無標籤文章" };

      const result = converter.convert(frontmatter);

      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.tags).toEqual([]);
    });

    it("tags 已是陣列時：保留原始值", () => {
      const frontmatter: Frontmatter = { title: "有標籤文章", tags: ["vue", "typescript"] };

      const result = converter.convert(frontmatter);

      expect(result.tags).toEqual(["vue", "typescript"]);
    });

    it("categories 非陣列時：自動初始化為空陣列", () => {
      const frontmatter: Frontmatter = { title: "無分類文章" };

      const result = converter.convert(frontmatter);

      expect(Array.isArray(result.categories)).toBe(true);
      expect(result.categories).toEqual([]);
    });

    it("categories 已是陣列時：保留原始值", () => {
      const frontmatter: Frontmatter = { title: "有分類文章", categories: ["tech", "backend"] };

      const result = converter.convert(frontmatter);

      expect(result.categories).toEqual(["tech", "backend"]);
    });

    it("轉換結果為新物件（不修改原始 frontmatter）", () => {
      const frontmatter: Frontmatter = { title: "原始文章" };
      const result = converter.convert(frontmatter);

      result.title = "修改後標題";

      // 原始物件不應被修改
      expect(frontmatter.title).toBe("原始文章");
    });

    it("空的 frontmatter 物件：不拋出錯誤", () => {
      const frontmatter: Frontmatter = {};

      expect(() => converter.convert(frontmatter)).not.toThrow();
    });
  });
});
