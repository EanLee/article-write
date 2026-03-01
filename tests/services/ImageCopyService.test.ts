import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImageCopyService } from "@/services/ImageCopyService";
import type { IFileSystem } from "@/types/IFileSystem";

// ── Mock FileSystem ───────────────────────────────────────────────────────────

function makeMockFileSystem(): IFileSystem {
  return {
    readDirectory: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    createDirectory: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    getFileStats: vi.fn(),
  } as unknown as IFileSystem;
}

// Mock window.electronAPI for copyFile
const mockElectronAPI = {
  copyFile: vi.fn().mockResolvedValue(undefined),
};
Object.defineProperty(window, "electronAPI", {
  value: mockElectronAPI,
  writable: true,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ImageCopyService", () => {
  let fileSystem: IFileSystem;
  let service: ImageCopyService;

  beforeEach(() => {
    fileSystem = makeMockFileSystem();
    service = new ImageCopyService(fileSystem);
    vi.clearAllMocks();
    (fileSystem.createDirectory as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fileSystem.deleteFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    mockElectronAPI.copyFile.mockResolvedValue(undefined);
  });

  // ── extractImageName ────────────────────────────────────────────────────

  describe("extractImageName()", () => {
    it("直接檔名格式：回傳檔名", () => {
      expect(service.extractImageName("photo.png")).toBe("photo.png");
    });

    it("路徑格式：回傳最後一段檔名", () => {
      expect(service.extractImageName("../../images/photo.png")).toBe("photo.png");
      expect(service.extractImageName("./images/logo.jpg")).toBe("logo.jpg");
    });

    it("非圖片副檔名：回傳 null", () => {
      expect(service.extractImageName("document.pdf")).toBeNull();
      expect(service.extractImageName("script.js")).toBeNull();
    });

    it("路徑末端為非圖片檔：回傳 null", () => {
      expect(service.extractImageName("/images/data.json")).toBeNull();
    });
  });

  // ── isValidImageFile ────────────────────────────────────────────────────

  describe("isValidImageFile()", () => {
    it("合法圖片副檔名應通過", () => {
      expect(service.isValidImageFile("photo.jpg")).toBe(true);
      expect(service.isValidImageFile("logo.PNG")).toBe(true);
      expect(service.isValidImageFile("icon.svg")).toBe(true);
      expect(service.isValidImageFile("image.webp")).toBe(true);
    });

    it("非圖片副檔名應失敗", () => {
      expect(service.isValidImageFile("doc.pdf")).toBe(false);
      expect(service.isValidImageFile("index.html")).toBe(false);
    });
  });

  // ── updateImagePath ─────────────────────────────────────────────────────

  describe("updateImagePath()", () => {
    it("替換內容中的圖片舊路徑為 ./images/ 格式", () => {
      const content = "![photo](../../images/photo.png)";
      const result = service.updateImagePath(content, "../../images/photo.png", "photo.png");
      expect(result).toBe("![photo](./images/photo.png)");
    });

    it("替換多次出現的相同路徑", () => {
      const content = "![a](./old/img.jpg) and ![b](./old/img.jpg)";
      const result = service.updateImagePath(content, "./old/img.jpg", "img.jpg");
      expect(result).toBe("![a](./images/img.jpg) and ![b](./images/img.jpg)");
    });

    it("正規式特殊字元在路徑中應被正確轉義", () => {
      const content = "![photo](./a+b.png)";
      const result = service.updateImagePath(content, "./a+b.png", "a+b.png");
      expect(result).toBe("![photo](./images/a+b.png)");
    });
  });

  // ── copyImageFile ───────────────────────────────────────────────────────

  describe("copyImageFile()", () => {
    it("呼叫 createDirectory 確保目標目錄存在", async () => {
      await service.copyImageFile("/source/photo.png", "/target/images/photo.png");
      expect(fileSystem.createDirectory).toHaveBeenCalledWith("/target/images");
    });

    it("呼叫 electronAPI.copyFile 複製圖片", async () => {
      await service.copyImageFile("/source/photo.png", "/target/images/photo.png");
      expect(mockElectronAPI.copyFile).toHaveBeenCalledWith(
        "/source/photo.png",
        "/target/images/photo.png",
      );
    });

    it("複製失敗時拋出錯誤", async () => {
      mockElectronAPI.copyFile.mockRejectedValue(new Error("磁碟空間不足"));

      await expect(
        service.copyImageFile("/source/photo.png", "/target/images/photo.png"),
      ).rejects.toThrow("磁碟空間不足");
    });
  });

  // ── batchCopyImages（P5-02 並發控制）───────────────────────────────────

  describe("batchCopyImages()（P5-02）", () => {
    it("成功複製所有圖片時回傳正確 successful 陣列", async () => {
      const imageNames = ["a.png", "b.jpg", "c.webp"];
      const result = await service.batchCopyImages(imageNames, "/source", "/target");

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.successful).toEqual(expect.arrayContaining(["a.png", "b.jpg", "c.webp"]));
    });

    it("部分失敗時分別紀錄在 failed 陣列", async () => {
      mockElectronAPI.copyFile
        .mockResolvedValueOnce(undefined)   // a.png 成功
        .mockRejectedValueOnce(new Error("檔案鎖定"))  // b.jpg 失敗
        .mockResolvedValueOnce(undefined);  // c.webp 成功

      const imageNames = ["a.png", "b.jpg", "c.webp"];
      const result = await service.batchCopyImages(imageNames, "/source", "/target");

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].name).toBe("b.jpg");
      expect(result.failed[0].error).toBe("檔案鎖定");
    });

    it("空陣列時不呼叫複製，回傳空結果", async () => {
      const result = await service.batchCopyImages([], "/source", "/target");

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(mockElectronAPI.copyFile).not.toHaveBeenCalled();
    });

    it("建立目標目錄", async () => {
      await service.batchCopyImages(["a.png"], "/source", "/target/images");
      expect(fileSystem.createDirectory).toHaveBeenCalledWith("/target/images");
    });

    it("worker queue 模式：正確處理超過並發限制的圖片數量", async () => {
      const imageNames = Array.from({ length: 10 }, (_, i) => `img${i}.png`);
      const result = await service.batchCopyImages(imageNames, "/source", "/target", 3);

      expect(result.successful).toHaveLength(10);
      expect(result.failed).toHaveLength(0);
    });
  });

  // ── cleanupUnusedImages ─────────────────────────────────────────────────

  describe("cleanupUnusedImages()", () => {
    it("刪除目標目錄中不在使用清單裡的圖片", async () => {
      (fileSystem.readDirectory as ReturnType<typeof vi.fn>).mockResolvedValue([
        "used.png",
        "unused.jpg",
        "also-used.webp",
      ]);

      const cleaned = await service.cleanupUnusedImages("/target/images", ["used.png", "also-used.webp"]);

      expect(fileSystem.deleteFile).toHaveBeenCalledWith("/target/images/unused.jpg");
      expect(cleaned).toEqual(["unused.jpg"]);
    });

    it("所有圖片都在使用清單中：不刪除任何檔案", async () => {
      (fileSystem.readDirectory as ReturnType<typeof vi.fn>).mockResolvedValue(["a.png", "b.jpg"]);

      const cleaned = await service.cleanupUnusedImages("/target/images", ["a.png", "b.jpg"]);

      expect(fileSystem.deleteFile).not.toHaveBeenCalled();
      expect(cleaned).toHaveLength(0);
    });

    it("readDirectory 失敗時：不拋出錯誤，回傳空陣列", async () => {
      (fileSystem.readDirectory as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("目錄不存在"));

      const cleaned = await service.cleanupUnusedImages("/target/images", []);

      expect(cleaned).toHaveLength(0);
    });

    it("忽略非圖片檔案（如 README.md）", async () => {
      (fileSystem.readDirectory as ReturnType<typeof vi.fn>).mockResolvedValue([
        "photo.png",
        "README.md",  // 非圖片，不應被刪除
        "notes.txt",  // 非圖片，不應被刪除
      ]);

      await service.cleanupUnusedImages("/target/images", []);

      // 只有 photo.png 是圖片，但它不在使用清單中，應被刪除
      expect(fileSystem.deleteFile).toHaveBeenCalledTimes(1);
      expect(fileSystem.deleteFile).toHaveBeenCalledWith("/target/images/photo.png");
    });
  });
});
