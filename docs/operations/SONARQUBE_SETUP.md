---
title: "SonarQube 本地靜態分析設定指南"
domain: operations
type: runbook
status: approved
owner: tech-team
updated: 2026-07-01
source_of_truth: false
---

# SonarQube 本地靜態分析設定指南

**建立日期**: 2026-07-01
**目的**: 在本地執行 SonarQube 靜態分析，持續追蹤程式碼品質

---

## 1. 服務資訊

| 項目 | 值 |
|------|-----|
| Server URL | `http://localhost:9000` |
| 版本 | SonarQube 26.6 |
| Project Key | `writeflow` |
| 帳號 | `admin` |
| 密碼 | `Admin123456!` |
| Scan Token | `squ_1dc90343e95af2813e09e18607ed8417c74dfa14` |

> ⚠️ Token 名稱為 `sonarqube-local`，於 2026-06-27 session 建立。

---

## 2. 執行 Scan

### 標準掃描（建議，含 coverage + 自動帶版號）

```bash
SONAR_TOKEN=squ_1dc90343e95af2813e09e18607ed8417c74dfa14 \
  SONAR_HOST_URL=http://localhost:9000 \
  pnpm run sonar
```

`pnpm run sonar` 會自動：
1. 跑 `pnpm run test:coverage` 產出 `coverage/lcov.info`
2. 從 `package.json` 讀取目前版本（`sonar.projectVersion`）
3. 呼叫 `npx sonar-scanner`

版本與 `package.json` 同步，SonarQube New Code Period 以版本為基準正確追蹤。

> `SONAR_TOKEN` 與 `SONAR_HOST_URL` 必須以環境變數提供；不再寫入任何設定檔，避免安全性掃描誤報。

---

## 3. 查詢結果

掃描完成後可從以下方式查看：

- **Dashboard**：`http://localhost:9000/dashboard?id=writeflow`
- **API 快速查詢**：

```bash
curl -s -u "squ_1dc90343e95af2813e09e18607ed8417c74dfa14:" \
  "http://localhost:9000/api/measures/component?component=writeflow&metricKeys=bugs,vulnerabilities,code_smells,security_hotspots,coverage"
```

---

## 4. 最新掃描結果（2026-07-01）

| 指標 | 數值 |
|------|------|
| Bugs | 0 |
| Vulnerabilities | 0 |
| Code Smells | 8 |
| Security Hotspots | 35 |
| Coverage | 26.6% |
| Duplication | 1.0% |
| Lines of Code | 15,396 |

---

## 5. sonar-project.properties 設定

`sonar.projectVersion` 與 `sonar.host.url`、`SONAR_TOKEN` **不**寫在 properties 檔：
- `sonar.projectVersion` 由 `pnpm run sonar` 動態從 `package.json` 注入
- `sonar.host.url` 透過 `SONAR_HOST_URL` 環境變數提供（避免本機 URL 污染 CI）
- Token 透過 `SONAR_TOKEN` 環境變數提供（避免 SonarQube 安全熱點誤報）

```properties
sonar.projectKey=writeflow
sonar.projectName=WriteFlow

sonar.sources=src
sonar.exclusions=**/node_modules/**,**/dist/**,**/dist-electron/**,**/*.spec.ts,**/*.test.ts,**/tests/**
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.typescript.tsconfigPath=tsconfig.json
sonar.sourceEncoding=UTF-8
```
