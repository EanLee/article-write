/**
 * FNV-1a hash（純 JS，同步，不依賴 Node.js Buffer 或 WebCrypto）
 * 用於儲存衝突偵測時比對檔案內容是否一致
 */
export function fnv1aHash(input: string): string {
  let h = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < input.length; i++) {
    h ^= input.codePointAt(i) ?? 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
