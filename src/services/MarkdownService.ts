import MarkdownIt from "markdown-it";
import * as yaml from "js-yaml";
import hljs from "highlight.js";
import markdownItHighlightjs from "markdown-it-highlightjs";
import markdownItToc from "markdown-it-table-of-contents";
import markdownItTaskLists from "markdown-it-task-lists";
import markdownItMark from "markdown-it-mark";
import markdownItFootnote from "markdown-it-footnote";
import type { Frontmatter } from "@/types";
import { generateSlug } from "@/utils/slugUtils";

/**
 * 解析後的 Markdown 內容介面
 */
export interface ParsedMarkdown {
  frontmatter: Partial<Frontmatter>;
  body: string;
  hasValidFrontmatter: boolean;
  errors: string[];
}

/**
 * Markdown 服務類別
 * 負責 Markdown 內容的解析、渲染和前置資料處理
 */
export class MarkdownService {
  private md: MarkdownIt;

  /**
   * 建構子 - 初始化 MarkdownService
   */
  constructor() {
    this.md = new MarkdownIt({
      html: true, // 允許 HTML 通過（ObsidianSyntaxService 需要注入 <mark>/<a>/<img> 等 HTML）
      // XSS 防護由 DOMPurify 在 PreviewPane.vue 的 sanitizedContent 計算屬性實施
      linkify: true,
      typographer: true,
      breaks: true,
    });

    // 配置語法高亮
    this.md.use(markdownItHighlightjs, {
      hljs,
      auto: true,
      code: true,
    });

    // 配置目錄
    this.md.use(markdownItToc, {
      includeLevel: [1, 2, 3, 4],
      containerClass: "table-of-contents",
      markerPattern: /^\[\[toc\]\]/im,
    });

    // 配置任務清單
    this.md.use(markdownItTaskLists, {
      enabled: true,
      label: true,
      labelAfter: true,
    });

    // 配置標記（高亮）語法
    this.md.use(markdownItMark);

    // 配置腳註
    this.md.use(markdownItFootnote);

    // 自定義 Obsidian 語法規則
    this.addObsidianRules();
  }

  /**
   * 渲染 Markdown 內容為 HTML
   * @param {string} content - Markdown 內容
   * @returns {string} 渲染後的 HTML
   */
  render(content: string): string {
    // 預處理 Obsidian 語法
    const processedContent = this.preprocessObsidianSyntax(content);
    return this.md.render(processedContent);
  }

  /**
   * 渲染 Markdown 內容為 HTML，包含預覽模式的特殊處理
   * @param {string} content - Markdown 內容
   * @param {boolean} isPreview - 是否為預覽模式
   * @returns {string} 渲染後的 HTML
   */
  renderForPreview(content: string, isPreview: boolean = true): string {
    let processedContent = content;

    if (isPreview) {
      // 在預覽模式中處理 Obsidian 特殊語法
      processedContent = this.preprocessObsidianSyntax(content);
    }

    return this.md.render(processedContent);
  }

  /**
   * 從 Markdown 內容中解析前置資料，包含完整的錯誤處理
   * @param {string} content - Markdown 內容
   * @returns {ParsedMarkdown} 解析結果
   */
  parseFrontmatter(content: string): ParsedMarkdown {
    const errors: string[] = [];
    let frontmatter: Partial<Frontmatter> = {};
    let body = content;
    let hasValidFrontmatter = false;

    // Match frontmatter pattern
    const frontmatterRegex = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (match) {
      const yamlContent = match[1];
      body = match[2];

      try {
        const parsed = yaml.load(yamlContent) as any;

        if (parsed && typeof parsed === "object") {
          frontmatter = this.validateAndNormalizeFrontmatter(parsed, errors);
          hasValidFrontmatter = errors.length === 0;
        } else {
          errors.push("Frontmatter must be a valid YAML object");
        }
      } catch (error) {
        errors.push(`YAML parsing error: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    } else if (content.trim().startsWith("---")) {
      errors.push("Frontmatter format is invalid - missing closing ---");
    }

    return {
      frontmatter,
      body,
      hasValidFrontmatter,
      errors,
    };
  }

  /**
   * 驗證並標準化前置資料
   * @param {any} data - 原始前置資料
   * @param {string[]} errors - 錯誤訊息陣列
   * @returns {Partial<Frontmatter>} 標準化後的前置資料
   */
  private validateAndNormalizeFrontmatter(data: Record<string, unknown>, errors: string[]): Partial<Frontmatter> {
    const frontmatter: Partial<Frontmatter> = {};

    // Title validation
    if (data.title) {
      if (typeof data.title === "string") {
        frontmatter.title = data.title.trim();
      } else {
        errors.push("Title must be a string");
      }
    }

    // Description validation
    if (data.description !== undefined) {
      if (typeof data.description === "string") {
        frontmatter.description = data.description.trim();
      } else {
        errors.push("Description must be a string");
      }
    }

    // Date validation
    if (data.date) {
      const dateStr = String(data.date);
      if (this.isValidDateString(dateStr)) {
        frontmatter.date = dateStr;
      } else {
        errors.push("Date must be in YYYY-MM-DD format");
      }
    }

    // Last modified validation
    if (data.lastmod) {
      const lastmodStr = String(data.lastmod);
      if (this.isValidDateString(lastmodStr)) {
        frontmatter.lastmod = lastmodStr;
      } else {
        errors.push("lastmod must be in YYYY-MM-DD format");
      }
    }

    // Tags validation
    if (data.tags !== undefined) {
      if (Array.isArray(data.tags)) {
        const filteredTags = data.tags
          .filter((tag: unknown): tag is string => typeof tag === "string")
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag.length > 0);

        if (data.tags.length !== filteredTags.length) {
          errors.push("Some tags are invalid - tags must be non-empty strings");
        }
        frontmatter.tags = filteredTags;
      } else {
        errors.push("Tags must be an array");
      }
    } else {
      frontmatter.tags = [];
    }

    // Categories validation
    if (data.categories !== undefined) {
      if (Array.isArray(data.categories)) {
        const validCategories = ["Software", "growth", "management"];
        const filteredCategories = data.categories.filter((cat: unknown): cat is string => typeof cat === "string" && validCategories.includes(cat));

        if (data.categories.length !== filteredCategories.length) {
          errors.push("Some categories are invalid - must be one of: Software, growth, management");
        }
        frontmatter.categories = filteredCategories;
      } else {
        errors.push("Categories must be an array");
      }
    } else {
      frontmatter.categories = [];
    }

    // Slug validation
    if (data.slug !== undefined) {
      if (typeof data.slug === "string") {
        const slug = data.slug.trim();
        if (this.isValidSlug(slug)) {
          frontmatter.slug = slug;
        } else {
          errors.push("Slug must contain only lowercase letters, numbers, and hyphens");
        }
      } else {
        errors.push("Slug must be a string");
      }
    }

    // Keywords validation
    if (data.keywords !== undefined) {
      if (Array.isArray(data.keywords)) {
        const filteredKeywords = data.keywords
          .filter((keyword: unknown): keyword is string => typeof keyword === "string")
          .map((keyword: string) => keyword.trim())
          .filter((keyword: string) => keyword.length > 0);

        if (data.keywords.length !== filteredKeywords.length) {
          errors.push("Some keywords are invalid - keywords must be non-empty strings");
        }
        frontmatter.keywords = filteredKeywords;
      } else {
        errors.push("Keywords must be an array");
      }
    } else {
      frontmatter.keywords = [];
    }

    // Series validation
    if (data.series !== undefined) {
      if (typeof data.series === "string") {
        frontmatter.series = data.series.trim();
      } else {
        errors.push("Series must be a string");
      }
    }

    // SeriesOrder validation
    if (data.seriesOrder !== undefined) {
      const order = Number(data.seriesOrder);
      if (Number.isInteger(order) && order > 0) {
        frontmatter.seriesOrder = order;
      } else {
        errors.push("seriesOrder must be a positive integer");
      }
    }

    return frontmatter;
  }

  /**
   * 從資料物件產生 YAML 前置資料
   * @param {Partial<Frontmatter>} data - 前置資料物件
   * @returns {string} YAML 格式的前置資料字串
   */
  generateFrontmatter(data: Partial<Frontmatter>): string {
    try {
      // Create a clean object with only defined values
      const cleanData: Record<string, unknown> = {};

      if (data.title) {
        cleanData.title = data.title;
      }
      if (data.description) {
        cleanData.description = data.description;
      }
      if (data.date) {
        cleanData.date = data.date;
      }
      if (data.lastmod) {
        cleanData.lastmod = data.lastmod;
      }
      if (data.status) {
        cleanData.status = data.status;
      }
      if (data.tags && data.tags.length > 0) {
        cleanData.tags = data.tags;
      }
      if (data.categories && data.categories.length > 0) {
        cleanData.categories = data.categories;
      }
      if (data.slug) {
        cleanData.slug = data.slug;
      }
      if (data.keywords && data.keywords.length > 0) {
        cleanData.keywords = data.keywords;
      }
      // 新增系列欄位支援
      if (data.series) {
        cleanData.series = data.series;
      }
      if (data.seriesOrder) {
        cleanData.seriesOrder = data.seriesOrder;
      }

      const yamlString = yaml.dump(cleanData, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      });

      return `---\n${yamlString}---\n`;
    } catch (error) {
      console.error("Failed to generate frontmatter:", error);
      return "---\n# Error generating frontmatter\n---\n";
    }
  }

  /**
   * 結合前置資料和內容為完整的 Markdown
   * @param {Partial<Frontmatter>} frontmatter - 前置資料
   * @param {string} body - 內容主體
   * @returns {string} 完整的 Markdown 內容
   */
  combineContent(frontmatter: Partial<Frontmatter>, body: string): string {
    const frontmatterString = this.generateFrontmatter(frontmatter);
    return frontmatterString + body;
  }

  /**
   * 解析 Markdown 文件（包含前置資料和內容）
   * @param {string} markdown - 完整的 Markdown 內容
   * @returns {{ frontmatter: Partial<Frontmatter>, content: string }} 解析結果
   */
  parseMarkdown(markdown: string): { frontmatter: Partial<Frontmatter>; content: string } {
    const parsed = this.parseFrontmatter(markdown);
    return {
      frontmatter: parsed.frontmatter,
      content: parsed.body,
    };
  }

  /**
   * 產生 Markdown 文件（包含前置資料和內容）
   * @param {Partial<Frontmatter>} frontmatter - 前置資料
   * @param {string} content - 文章內容
   * @returns {string} 完整的 Markdown 內容
   */
  generateMarkdown(frontmatter: Partial<Frontmatter>, content: string): string {
    return this.combineContent(frontmatter, content);
  }

  /**
   * 驗證日期字串格式 (YYYY-MM-DD)
   * @param {string} dateStr - 日期字串
   * @returns {boolean} 是否為有效日期格式
   */
  private isValidDateString(dateStr: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      return false;
    }

    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime()) && date.toISOString().startsWith(dateStr);
  }

  /**
   * 驗證 slug 格式（僅允許小寫字母、數字和連字號）
   * @param {string} slug - URL slug
   * @returns {boolean} 是否為有效 slug 格式
   */
  private isValidSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug) && !slug.startsWith("-") && !slug.endsWith("-");
  }

  /**
   * 從標題產生有效的 slug（統一改用 slugUtils）
   * @param {string} title - 文章標題
   * @returns {string} 產生的 slug
   */
  generateSlugFromTitle(title: string): string {
    return generateSlug(title);
  }

  /**
   * 從 Markdown 內容中提取所有圖片引用
   * @param {string} content - Markdown 內容
   * @returns {string[]} 圖片路徑陣列
   */
  extractImageReferences(content: string): string[] {
    // 使用 matchAll 優化正則匹配（更簡潔高效）
    const standardImages = [...content.matchAll(/!\[.*?\]\(([^)]+)\)/g)].map((m) => m[1]);

    const obsidianImages = [...content.matchAll(/!\[\[([^\]]+)\]\]/g)].map((m) => m[1]);

    // 合併並去重
    return [...new Set([...standardImages, ...obsidianImages])];
  }

  /**
   * 從 Markdown 內容中提取所有 Wiki 連結
   * @param {string} content - Markdown 內容
   * @returns {Array<{ link: string; alias?: string }>} Wiki 連結陣列
   */
  extractWikiLinks(content: string): Array<{ link: string; alias?: string }> {
    // 使用 matchAll 優化正則匹配
    return [...content.matchAll(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g)].map((match) => ({
      link: match[1],
      alias: match[3],
    }));
  }

  /**
   * 添加 Obsidian 特殊語法規則
   */
  private addObsidianRules(): void {
    // Wiki 連結規則 [[link]] 或 [[link|alias]]
    this.md.inline.ruler.before("link", "wikilink", (state, silent) => {
      const start = state.pos;
      const max = state.posMax;

      if (start + 4 >= max) {
        return false;
      }
      if (state.src.charCodeAt(start) !== 0x5b /* [ */) {
        return false;
      }
      if (state.src.charCodeAt(start + 1) !== 0x5b /* [ */) {
        return false;
      }

      let pos = start + 2;
      let found = false;
      let content = "";

      while (pos < max) {
        if (state.src.charCodeAt(pos) === 0x5d /* ] */ && state.src.charCodeAt(pos + 1) === 0x5d /* ] */) {
          found = true;
          break;
        }
        content += state.src[pos];
        pos++;
      }

      if (!found) {
        return false;
      }

      state.pos = start + 2;
      state.posMax = pos;

      if (!silent) {
        const parts = content.split("|");
        const link = parts[0].trim();
        const alias = parts[1] ? parts[1].trim() : link;

        const token = state.push("wikilink", "", 0);
        token.content = content;
        token.meta = { link, alias };
      }

      state.pos = pos + 2;
      return true;
    });

    // 渲染 Wiki 連結
    this.md.renderer.rules.wikilink = (tokens, idx) => {
      const token = tokens[idx];
      const { link, alias } = token.meta;
      return `<a href="#" class="wikilink" data-link="${this.escapeHtml(link)}">${this.escapeHtml(alias)}</a>`;
    };

    // Obsidian 圖片語法 ![[image.png]]
    this.md.inline.ruler.before("image", "obsidian_image", (state, silent) => {
      const start = state.pos;
      const max = state.posMax;

      if (start + 5 >= max) {
        return false;
      }
      if (state.src.charCodeAt(start) !== 0x21 /* ! */) {
        return false;
      }
      if (state.src.charCodeAt(start + 1) !== 0x5b /* [ */) {
        return false;
      }
      if (state.src.charCodeAt(start + 2) !== 0x5b /* [ */) {
        return false;
      }

      let pos = start + 3;
      let found = false;
      let content = "";

      while (pos < max) {
        if (state.src.charCodeAt(pos) === 0x5d /* ] */ && state.src.charCodeAt(pos + 1) === 0x5d /* ] */) {
          found = true;
          break;
        }
        content += state.src[pos];
        pos++;
      }

      if (!found) {
        return false;
      }

      if (!silent) {
        const token = state.push("obsidian_image", "img", 0);
        token.content = content.trim();
        token.attrSet("src", `./images/${content.trim()}`);
        token.attrSet("alt", content.trim());
      }

      state.pos = pos + 2;
      return true;
    });

    // 渲染 Obsidian 圖片
    this.md.renderer.rules.obsidian_image = (tokens, idx) => {
      const token = tokens[idx];
      const src = token.attrGet("src");
      const alt = token.attrGet("alt");
      return `<img src="${this.escapeHtml(src || "")}" alt="${this.escapeHtml(alt || "")}" class="obsidian-image" />`;
    };
  }

  /**
   * 預處理 Obsidian 語法
   * @param {string} content - 原始內容
   * @returns {string} 處理後的內容
   */
  private preprocessObsidianSyntax(content: string): string {
    let processed = content;

    // 處理 Obsidian 高亮語法 ==text== 轉換為 <mark>text</mark>
    processed = processed.replace(/==(.*?)==/g, "<mark>$1</mark>");

    // 處理 Obsidian 註釋 %%comment%% （在預覽中隱藏）
    processed = processed.replace(/%%.*?%%/g, "");

    // 處理 Obsidian 標籤 #tag (支援中文)
    processed = processed.replace(/#([a-zA-Z0-9\u4e00-\u9fff_-]+)/g, '<span class="tag">#$1</span>');

    return processed;
  }

  /**
   * 轉義 HTML 特殊字符
   * @param {string} text - 要轉義的文字
   * @returns {string} 轉義後的文字
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * 取得語法高亮支援的語言清單
   * @returns {string[]} 支援的語言清單
   */
  getSupportedLanguages(): string[] {
    return hljs.listLanguages();
  }

  /**
   * 檢查內容中的語法錯誤
   * @param {string} content - Markdown 內容
   * @returns {Array<{line: number, message: string, type: 'error' | 'warning'}>} 語法錯誤清單
   */
  validateMarkdownSyntax(content: string): Array<{ line: number; message: string; type: "error" | "warning" }> {
    const errors: Array<{ line: number; message: string; type: "error" | "warning" }> = [];
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // 檢查未閉合的 Wiki 連結
      const openWikiLinks = (line.match(/\[\[/g) || []).length;
      const closeWikiLinks = (line.match(/\]\]/g) || []).length;
      if (openWikiLinks !== closeWikiLinks) {
        errors.push({
          line: lineNumber,
          message: "未閉合的 Wiki 連結",
          type: "error",
        });
      }

      // 檢查未閉合的高亮語法
      const highlightMarks = (line.match(/==/g) || []).length;
      if (highlightMarks % 2 !== 0) {
        errors.push({
          line: lineNumber,
          message: "未閉合的高亮語法 ==",
          type: "error",
        });
      }

      // 檢查未閉合的註釋
      const commentStart = (line.match(/%%/g) || []).length;
      if (commentStart % 2 !== 0) {
        errors.push({
          line: lineNumber,
          message: "未閉合的註釋 %%",
          type: "warning",
        });
      }

      // 檢查圖片語法
      if (line.includes("![[") && !line.includes("]]")) {
        errors.push({
          line: lineNumber,
          message: "未閉合的圖片語法",
          type: "error",
        });
      }
    });

    return errors;
  }
}

// 單例實例
export const markdownService = new MarkdownService();
