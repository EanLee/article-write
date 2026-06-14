/**
 * Electron 測試 Fixture
 * 負責啟動/關閉 Electron App，提供 electronApp 與 window 給測試使用
 *
 * 使用方式：
 *   import { test, expect } from './helpers/electron-fixture'
 *   test('...', async ({ window }) => { ... })
 *
 * 設計說明：
 * - electronApp / testVaultPath 使用 worker scope，同一測試檔案共用一個 App 實例
 * - window 每個測試重新取得（確保乾淨狀態）
 * - 需明確過濾 DevTools 視窗，取得真正的 App 主視窗
 */

import { test as base, expect, _electron as electron } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import fs from "fs";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "../../..");
const MAIN_JS = path.join(ROOT, "dist/main/main.js");

/** 取得 App 主視窗（排除 DevTools） */
async function getAppWindow(app: ElectronApplication): Promise<Page> {
  // 等待視窗出現，最多嘗試 10 秒
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const windows = app.windows();
    for (const win of windows) {
      const url = win.url();
      if (!url.startsWith("devtools://")) {
        // 等待 Vue App 掛載（#app 元素有子元素）
        await win.waitForFunction(
          () => {
            const app = document.getElementById("app");
            return app !== null && app.children.length > 0;
          },
          undefined,
          { timeout: 30000 },
        );
        return win;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("無法找到 App 主視窗（非 DevTools）");
}

export type WorkerFixtures = {
  electronApp: ElectronApplication;
  testVaultPath: string;
};

export type TestFixtures = {
  window: Page;
};

/** 所有 fixture 的聯合型別（供外部使用） */
export type ElectronFixtures = TestFixtures & WorkerFixtures;

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // worker scope：整個測試檔案共用一個 App 實例
  testVaultPath: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), "writeflow-test-"));
      await use(vaultPath);
      fs.rmSync(vaultPath, { recursive: true, force: true });
    },
    { scope: "worker", timeout: 60000 },
  ],

  electronApp: [
    async ({ testVaultPath }, use) => {
      // 每個 worker 使用獨立的 userData 目錄，避免並行測試共享 config.json 產生競態
      const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "writeflow-userdata-"));

      // 預先寫入完整 config.json，避免測試啟動時觸碰真實設定檔或進入初始化流程
      const testConfig = {
        paths: {
          articlesDir: testVaultPath,
          targetDir: "",
          imagesDir: "",
        },
        editorConfig: {
          autoSave: false,
          autoSaveInterval: 30000,
          theme: "light",
        },
      };
      fs.writeFileSync(path.join(userDataPath, "config.json"), JSON.stringify(testConfig, null, 2), "utf-8");

      const app = await electron.launch({
        args: ["--no-sandbox", `--user-data-dir=${userDataPath}`, MAIN_JS],
        env: {
          ...process.env,
          NODE_ENV: "test",
          TEST_VAULT_PATH: testVaultPath,
        },
      });
      // 預先等待 App 主視窗載入完成，並自動接受 beforeunload 對話框
      const win = await getAppWindow(app);
      // accept() 可能因 dialog 已自行關閉而 reject（reload 競態），須捕捉避免讓後續測試失敗
      win.on("dialog", (dialog) => dialog.accept().catch(() => {}));
      // 捕捉 renderer console 到檔案，供測試失敗時直接定位 app 端行為（不進測試輸出）
      const consoleLogPath = path.join(ROOT, "test-results", "renderer-console.log");
      fs.mkdirSync(path.dirname(consoleLogPath), { recursive: true });
      fs.writeFileSync(consoleLogPath, "");
      win.on("console", (msg) => {
        try {
          fs.appendFileSync(consoleLogPath, `[${new Date().toISOString()}] [${msg.type()}] ${msg.text()}\n`);
        } catch {
          // log 寫入失敗不影響測試
        }
      });
      await use(app);
      // 若編輯器有未儲存變更，App.vue 的 beforeunload 會 preventDefault，
      // 導致主程序無 will-prevent-unload 處理而視窗無法關閉、app.close() 永遠不 resolve。
      // 加上逾時保護：超時後強制終止 process，避免拖垂 worker teardown（60s/90s）。
      let closed = false;
      const closePromise = app
        .close()
        .then(() => {
          closed = true;
        })
        .catch(() => {
          closed = true;
        });
      await Promise.race([closePromise, new Promise((resolve) => setTimeout(resolve, 5000))]);
      if (!closed) {
        const proc = app.process();
        const exited = new Promise<void>((resolve) => proc.once("exit", () => resolve()));
        // 視窗無法關閉時，app.process().kill() 只會終止主程序，
        // GPU/renderer/utility 等子程序會變成孤兒並持續鎖住 testVaultPath 內的檔案。
        // Windows 上以 taskkill /T /F 終止整個程序樹；其他平台 fallback 為 proc.kill()。
        if (process.platform === "win32" && proc.pid) {
          try {
            execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
          } catch {
            // 程序可能已結束
          }
        } else {
          proc.kill();
        }
        await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
      }
      try {
        fs.rmSync(userDataPath, { recursive: true, force: true });
      } catch {
        // process 結束後檔案鎖可能延遲釋放，清理失敗不影響測試結果
      }
    },
    { scope: "worker", timeout: 60000 },
  ],

  // test scope：每個測試取得 App 主視窗
  window: async ({ electronApp }, use) => {
    const page = await getAppWindow(electronApp);
    await use(page);
  },
});

export { expect };
