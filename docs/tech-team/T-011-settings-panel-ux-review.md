# T-011 Settings Panel UX 評估

**日期**: 2026-02-17
**負責人**: Alex（UI/UX）
**狀態**: ✅ 完成

## 任務背景

使用者反映 SettingsPanel 有兩個問題：
1. 畫面出現多個 scrollbar（modal 自身 + 內層 `overflow-y-auto` 的 tab content 區）
2. AI 設定 tab 放在最後，不直覺、難以被發現

目前 SettingsPanel 架構：
- Modal（`max-h-[90vh]`）
- Tab bar（5 個 tab：基本設定、部落格框架、編輯器、Git 發布、AI 設定）
- Tab content area（`overflow-y-auto max-h-[calc(90vh-240px)]`）

AI tab 在最後一個位置，且名稱是「AI 設定」，沒有視覺強調。

## 討論記錄

---

### 問題分析階段

Sam：「scrollbar 的根本原因我看清楚了。`modal-box` 上有 `max-h-[90vh]`，DaisyUI 的 `modal-box` 預設有 `overflow: auto`，所以 modal 本身就已經會捲動。內層 tab content（第 78 行）又加了 `overflow-y-auto max-h-[calc(90vh-240px)]`，等於你在一個已經會捲動的容器裡面又放了一個會捲動的容器——兩層 overflow，當然就出現兩個 scrollbar。

修最乾淨的方式是把 modal-box 改成 `flex flex-col`，讓高度由 flex 分配。header、tabs、footer 用 `flex-shrink-0` 固定高度，tab content 那層改成 `flex-1 overflow-y-auto`，然後把外層 `max-h-[90vh]` 保留讓 modal 整體不超出視窗。內層那個 `max-h-[calc(90vh-240px)]` 就可以整個拿掉——這個 magic number 本來就是 workaround，不是真正的解法。」

Wei：「方向是對的，但 DaisyUI modal-box 預設有 `max-h-[90vh]`，改成 flex 後高度需要有個 anchor，我建議加 `h-full` 讓它繼承 modal 容器的高度比較省事。整體是：modal-box 加 `flex flex-col h-full`，header/tabs/footer 各自 `flex-shrink-0`，tab content 用 `flex-1 overflow-y-auto`。內層那個 `max-h-[calc...]` 拿掉，不用硬算了。」

Alex：「技術的事我讓你們決定，但 AI tab 排最後這件事我有意見。用戶設完基本路徑和框架之後，接下來最想試的應該是 AI 功能，不是調編輯器細節。目前排序是：基本設定 → 部落格框架 → 編輯器 → Git 發布 → AI 設定。我建議調成：基本設定 → 部落格框架 → AI 設定 → 編輯器 → Git 發布。AI 是差異化賣點，不應該藏在最後。」

Lin：「從 IPC 流向看，現在 `open-settings` emit 沒帶任何 payload，App.vue 只收到 `showSettings = true`，SettingsPanel 根本不知道是誰開的、要顯示哪個 tab。這設計有點鬆散。如果之後有別的地方也要開 settings modal 並指定 tab，就會處理不了。建議 emit 改成 `emit('open-settings', { tab: 'ai' })`，App.vue 再把這個資訊傳給 SettingsPanel 當 prop。」

Sam：「AI tab 導航問題分兩個層面。第一，tab 順序：技術上調換 template 裡 tab 的順序是零成本的，Alex 說的調法我支持。第二，從 AI Panel 點『前往設定』後停在 basic tab——最乾淨的方式是 SettingsPanel 加一個 `initialTab?: string` prop，watch modelValue 開啟時把 `activeTab` 設成 `initialTab`。呼叫端改成傳 `initialTab='ai'` 就行了，不需要 global state，不需要 event bus，就是個 prop。」

Wei：「`initialTab` prop 設計可以，但實作要注意：用 `watch(() => props.modelValue)` 監聽開啟時機才穩，然後在開啟時把 `activeTab.value` 設成 `props.initialTab ?? 'basic'`。每次開啟都重設，這樣從不同地方開啟都能到對的 tab。另外問一下——AI panel 那邊每次點前往設定都要跳 AI tab 嗎？我猜是。」

Alex：「對，每次都要跳。從 AI Panel 點『前往設定』，使用者的意圖就是要設定 AI key，如果跳到基本設定那邏輯完全斷掉了。還有，AI tab 可以加個視覺提示，比如當沒有任何 API Key 設定時，tab 上加個小圓點或 badge，讓使用者知道『這裡有東西要設定』。」

Lin：「另外 `loadAiKeyStatus()` 每次 modal 開啟都打三次 IPC（三個 provider 各一次）。可以考慮整合成一個 `getAiKeyStatuses()` IPC call 一次回傳三個狀態。但這個優先級比今天兩個主要問題低，可以後續再做。」

---

### 收斂階段

Sam：「好，來收斂。今天優先處理三件事：一、scrollbar 修復用 flex column 方案；二、AI tab 移到第三個位置；三、加 `initialTab` prop，從 AI Panel 開啟時傳 `'ai'`。Lin 的 IPC 整合是好建議，但今天不在範圍內，記起來下次做。Alex 的 badge 建議也先記下來，現在聚焦在功能正確性。」

Wei：「沒意見，我去修 CSS 那塊。`modal-box` 改 `flex flex-col`，搭配 `h-full max-h-[90vh]`，內層 tab content 改 `flex-1 overflow-y-auto`，footer 加 `flex-shrink-0`。」

Alex：「Tab 順序確認：基本設定 → 部落格框架 → AI 設定 → 編輯器 → Git 發布。AI 設定移到第三。」

Lin：「emit 帶 payload 的部分——建議 AIPanelView 改成 `$emit('open-settings', 'ai')`，App.vue 接收時設 `settingsInitialTab = tab ?? 'basic'`，再 v-bind 到 SettingsPanel。這樣以後哪裡都能指定 tab。」

## 設計決策

### 決策 1：修復多重 scrollbar

**方案**：modal-box flex column 重構

```html
<!-- 修改前 -->
<div class="modal-box w-11/12 max-w-5xl max-h-[90vh]">
  <div class="overflow-y-auto max-h-[calc(90vh-240px)]">...</div>
  <div class="flex justify-between mt-6 pt-4">...</div>
</div>

<!-- 修改後 -->
<div class="modal-box w-11/12 max-w-5xl max-h-[90vh] flex flex-col">
  <!-- header: flex-shrink-0 -->
  <!-- tabs: flex-shrink-0 -->
  <div class="flex-1 overflow-y-auto">...</div>
  <!-- footer: flex-shrink-0 -->
</div>
```

移除 `max-h-[calc(90vh-240px)]` magic number。

### 決策 2：AI tab 位置調整

**新順序**：基本設定 → 部落格框架 → **AI 設定** → 編輯器 → Git 發布

理由：AI 是核心差異化功能，使用者完成基本配置後第一個想嘗試的應該是 AI，不應排最後。

### 決策 3：`initialTab` prop + 開啟時跳 AI tab

**AIPanelView.vue**：
```vue
<button @click="$emit('open-settings', 'ai')">⚙ 前往設定</button>
```

**App.vue**：
```vue
<SettingsPanel v-model="showSettings" :initial-tab="settingsInitialTab" />

// script
const settingsInitialTab = ref('basic')
function handleOpenSettings(tab?: string) {
  settingsInitialTab.value = tab ?? 'basic'
  showSettings.value = true
}
```

**SettingsPanel.vue**：
```typescript
const props = defineProps<{ modelValue: boolean; initialTab?: string }>()

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    activeTab.value = props.initialTab ?? 'basic'
    // ...其他 loadAiKeyStatus() 等初始化
  }
})
```

### 延後項目

- IPC 整合：合併三個 `aiHasApiKey` 為單一 `getAiKeyStatuses()` call（Lin 建議）
- AI tab badge：沒有 API Key 時顯示視覺提示（Alex 建議）

## 相關檔案

- `src/components/SettingsPanel.vue`
- `src/components/AIPanelView.vue`
- `src/App.vue`

## 相關 Commit

<!-- 實作完成後填入 -->
