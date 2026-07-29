import { describe, it, expect, afterEach } from "vitest"
import { mount, type VueWrapper } from "@vue/test-utils"
import PreviewPane from "@/components/PreviewPane.vue"

/**
 * PreviewPane - 圖片載入失敗容錯
 *
 * DOMPurify.sanitize() 會剝除 <img onerror="..."> 這類 inline event handler
 * （已用 dompurify + jsdom 實測驗證），所以破圖偵測不能寫在 PreviewService 產出的
 * HTML 字串裡，必須在元件層用 addEventListener 掛在容器上（error 事件不冒泡，需 capture）。
 */
function makeProps(renderedContent: string) {
  return {
    renderedContent,
    stats: { wordCount: 0, characterCount: 0, readingTime: 0, imageCount: 0, linkCount: 0 },
    validation: { validImages: [], invalidImages: [], validLinks: [], invalidLinks: [] },
  }
}

describe("PreviewPane - 圖片載入失敗容錯", () => {
  let wrapper: VueWrapper | undefined

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it("<img> 觸發 error 事件時應加上 obsidian-image-broken 樣式與破圖提示 alt", async () => {
    wrapper = mount(PreviewPane, {
      props: makeProps('<img src="local-file:///missing.png" alt="test-image.png" class="obsidian-image">'),
      attachTo: document.body,
    })

    const img = wrapper.find("img").element as HTMLImageElement
    img.dispatchEvent(new Event("error"))
    await wrapper.vm.$nextTick()

    expect(img.classList.contains("obsidian-image-broken")).toBe(true)
    expect(img.alt).toContain("⚠ 圖片載入失敗")
    expect(img.alt).toContain("test-image.png")
  })

  it("重複觸發 error 不應重複疊加破圖提示文字", async () => {
    wrapper = mount(PreviewPane, {
      props: makeProps('<img src="local-file:///missing.png" alt="test-image.png" class="obsidian-image">'),
      attachTo: document.body,
    })

    const img = wrapper.find("img").element as HTMLImageElement
    img.dispatchEvent(new Event("error"))
    img.dispatchEvent(new Event("error"))
    await wrapper.vm.$nextTick()

    const prefixCount = (img.alt.match(/⚠ 圖片載入失敗/g) || []).length
    expect(prefixCount).toBe(1)
  })

  it("正常載入（未觸發 error）不應加上 obsidian-image-broken", () => {
    wrapper = mount(PreviewPane, {
      props: makeProps('<img src="local-file:///ok.png" alt="ok.png" class="obsidian-image">'),
      attachTo: document.body,
    })

    const img = wrapper.find("img").element as HTMLImageElement
    expect(img.classList.contains("obsidian-image-broken")).toBe(false)
  })
})
