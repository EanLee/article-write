# 文件的精簡與處置原則 (Document Streamlining Principles)

本準則用於審查 `docs/` 目錄下 AI 開發過程中產生的文件，旨在移除過時、重複或僅具過程意義的內容。

## 1. 判定標準
- **與程式碼重複 (Redundant with Code)**: 若文件描述的實作細節已在程式碼中清晰表達，或僅是程式碼結構的文字複述 $\rightarrow$ **精簡或移除**。
- **過程產物 (Process Artifacts)**: 討論串 (Discussion)、決策過程 (Topic/Decision/Pending)、審查報告 (Review Reports) 等僅在開發當時有意義的過渡性文件 $\rightarrow$ **若最終結果已記錄於架構文件或程式碼中 $\rightarrow$ 移除/封存**。
- **過時計畫 (Obsolete Plans)**: 已完成的日計畫、舊版 Sprint 摘要、不再參考的里程碑 $\rightarrow$ **移除**。
- **冗餘分析 (Redundant Analysis)**: 被後續版本取代的分析報告、初步探索筆記 $\rightarrow$ **僅保留最終版或最具參考價值的版本 $\rightarrow$ 其餘移除**。

## 2. 處置操作
- **精簡 (Simplify)**: 僅保留結論、關鍵決策點或未來需要參考的陷阱 (Gotchas)，移除詳細的推演過程。
- **移除 (Remove)**: 完全過時或在 Git 歷史中即可追溯且無額外價值的內容。
- **合併 (Merge)**: 將碎片化的討論結果整合至對應的主題文件。

## 3. 格式規範
- **行尾**: 必須使用 CRLF。
- **Frontmatter**: 保持一致性，不刪除必要欄位。
