export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type 必須是以下之一
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 錯誤修復
        'docs',     // 文檔更新
        'style',    // 程式碼格式調整
        'refactor', // 重構
        'perf',     // 效能優化
        'test',     // 測試
        'chore',    // 建置/工具
        'revert',   // 還原
        'ci',       // CI/CD
        'build'     // 建置系統
      ]
    ],
    // Subject 不能為空
    'subject-empty': [2, 'never'],
    // Subject 不要以句號結尾
    'subject-full-stop': [2, 'never', '.'],
    // Type 必須小寫
    'type-case': [2, 'always', 'lower-case'],
    // Scope 必須小寫
    'scope-case': [2, 'always', 'lower-case'],
    // Header 最大長度（中文字算 2 個字元）
    'header-max-length': [2, 'always', 100],
    // Body 每行最大長度
    'body-max-line-length': [2, 'always', 200]
  }
}
