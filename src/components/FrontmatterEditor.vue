<template>
  <div v-if="modelValue" class="modal modal-open">
    <div class="modal-box w-11/12 max-w-2xl max-h-[90vh] flex flex-col">
      <h3 class="font-bold text-lg mb-4 flex-shrink-0">編輯前置資料</h3>

      <form v-if="localArticle" @submit.prevent="handleSave" class="space-y-3 overflow-y-auto flex-1 pr-1">
        <!-- 標題 -->
        <div>
          <label class="block text-sm font-medium mb-1">標題 *</label>
          <input
            v-model="localArticle.frontmatter.title"
            type="text"
            placeholder="文章標題"
            class="input input-bordered w-full"
            @input="updateSlug"
          />
        </div>

        <!-- 網址代稱 + 分類（同行） -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">網址代稱</label>
            <input
              v-model="localArticle.slug"
              type="text"
              placeholder="自動生成"
              class="input input-bordered w-full"
            />
            <p class="text-xs text-base-content/50 mt-1">留空將根據標題自動生成</p>
          </div>

          <div class="relative">
            <label class="block text-sm font-medium mb-1">分類</label>
            <input
              v-model="categoryInput"
              type="text"
              placeholder="輸入或選擇分類"
              class="input input-bordered w-full"
              @input="onCategoryInput"
              @focus="showCategoryDropdown = true"
              @blur="onCategoryBlur"
            />
            <ul
              v-if="showCategoryDropdown && filteredCategories.length"
              class="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-box shadow-md max-h-40 overflow-y-auto"
            >
              <li
                v-for="cat in filteredCategories"
                :key="cat"
                class="px-3 py-2 cursor-pointer hover:bg-base-200 text-sm"
                @mousedown.prevent="selectCategory(cat)"
              >
                {{ cat }}
              </li>
            </ul>
          </div>
        </div>

        <!-- 描述 -->
        <div>
          <label class="block text-sm font-medium mb-1">描述</label>
          <textarea
            v-model="localArticle.frontmatter.description"
            class="textarea textarea-bordered w-full"
            rows="2"
            placeholder="文章描述（可選）"
          ></textarea>
        </div>

        <!-- 發布日期 + 系列（同行） -->
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">發布日期</label>
            <input
              v-model="publishDate"
              type="date"
              class="input input-bordered w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">系列名稱</label>
            <input
              v-model="localArticle.frontmatter.series"
              type="text"
              placeholder="例如：Vue 3 系列"
              class="input input-bordered w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">系列順序</label>
            <input
              v-model.number="localArticle.frontmatter.seriesOrder"
              type="number"
              min="1"
              placeholder="1"
              class="input input-bordered w-full"
              :disabled="!localArticle.frontmatter.series"
            />
          </div>
        </div>

        <!-- 標籤 + 關鍵字（同行） -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">標籤</label>
            <div class="flex flex-wrap gap-1 min-h-8 mb-2">
              <span
                v-for="tag in localArticle.frontmatter.tags"
                :key="tag"
                class="badge badge-primary gap-1"
              >
                {{ tag }}
                <button
                  type="button"
                  class="cursor-pointer leading-none hover:opacity-60"
                  @click="removeTag(tag)"
                >×</button>
              </span>
            </div>
            <div class="join w-full">
              <input
                v-model="newTag"
                type="text"
                placeholder="輸入標籤"
                class="input input-bordered input-sm join-item flex-1"
                @keyup.enter="addTag"
              />
              <button type="button" class="btn btn-primary btn-sm join-item" @click="addTag">新增</button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">SEO 關鍵字</label>
            <div class="flex flex-wrap gap-1 min-h-8 mb-2">
              <span
                v-for="keyword in localArticle.frontmatter.keywords"
                :key="keyword"
                class="badge badge-secondary gap-1"
              >
                {{ keyword }}
                <button
                  type="button"
                  class="cursor-pointer leading-none hover:opacity-60"
                  @click="removeKeyword(keyword)"
                >×</button>
              </span>
            </div>
            <div class="join w-full">
              <input
                v-model="newKeyword"
                type="text"
                placeholder="輸入關鍵字"
                class="input input-bordered input-sm join-item flex-1"
                @keyup.enter="addKeyword"
              />
              <button type="button" class="btn btn-secondary btn-sm join-item" @click="addKeyword">新增</button>
            </div>
          </div>
        </div>
      </form>

      <div class="modal-action flex-shrink-0 mt-4">
        <button class="btn" @click="handleClose">取消</button>
        <button class="btn btn-primary" @click="handleSave">儲存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import type { Article } from "@/types"
import { autoSaveService } from "@/services/AutoSaveService"
import { metadataCacheService } from "@/services/MetadataCacheService"

interface Props {
  modelValue: boolean
  article: Article | null
}

interface Emits {
  (e: "update:modelValue", value: boolean): void
  (e: "update", article: Article): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localArticle = ref<Article | null>(null)
const publishDate = ref("")
const newTag = ref("")
const newKeyword = ref("")

// 分類 combobox
const categoryInput = ref("")
const showCategoryDropdown = ref(false)
const allCategories = ref<string[]>([])

const filteredCategories = computed(() => {
  const q = categoryInput.value.trim().toLowerCase()
  if (!q) { return allCategories.value }
  return allCategories.value.filter(c => c.toLowerCase().includes(q))
})

function onCategoryInput() {
  if (localArticle.value) {
    localArticle.value.category = categoryInput.value as Article["category"]
  }
  showCategoryDropdown.value = true
}

function selectCategory(category: string) {
  categoryInput.value = category
  if (localArticle.value) {
    localArticle.value.category = category as Article["category"]
  }
  showCategoryDropdown.value = false
}

function onCategoryBlur() {
  // 延遲關閉，讓點擊選項的事件先觸發
  setTimeout(() => { showCategoryDropdown.value = false }, 150)
}

// Methods
function updateSlug() {
  if (localArticle.value && localArticle.value.frontmatter.title) {
    const slug = generateSlug(localArticle.value.frontmatter.title)
    localArticle.value.slug = slug
    if (!localArticle.value.frontmatter.slug) {
      localArticle.value.frontmatter.slug = slug
    }
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, "") // Allow Chinese characters
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

function addTag() {
  if (newTag.value.trim() && localArticle.value) {
    const tag = newTag.value.trim()
    if (!localArticle.value.frontmatter.tags.includes(tag)) {
      localArticle.value.frontmatter.tags.push(tag)
    }
    newTag.value = ""
  }
}

function removeTag(tag: string) {
  if (localArticle.value) {
    const index = localArticle.value.frontmatter.tags.indexOf(tag)
    if (index > -1) {
      localArticle.value.frontmatter.tags.splice(index, 1)
    }
  }
}

function addKeyword() {
  if (newKeyword.value.trim() && localArticle.value) {
    const keyword = newKeyword.value.trim()
    if (!localArticle.value.frontmatter.keywords) {
      localArticle.value.frontmatter.keywords = []
    }
    if (!localArticle.value.frontmatter.keywords.includes(keyword)) {
      localArticle.value.frontmatter.keywords.push(keyword)
    }
    newKeyword.value = ""
  }
}

function removeKeyword(keyword: string) {
  if (localArticle.value && localArticle.value.frontmatter.keywords) {
    const index = localArticle.value.frontmatter.keywords.indexOf(keyword)
    if (index > -1) {
      localArticle.value.frontmatter.keywords.splice(index, 1)
    }
  }
}

function handleSave() {
  if (!localArticle.value) {return}

  // Update the article title if frontmatter title changed
  localArticle.value.title = localArticle.value.frontmatter.title

  // Update publish date
  if (publishDate.value) {
    localArticle.value.frontmatter.date = publishDate.value
  }

  // Update categories array
  localArticle.value.frontmatter.categories = [localArticle.value.category]

  // Update lastmod
  localArticle.value.frontmatter.lastmod = new Date().toISOString().split("T")[0]
  localArticle.value.lastModified = new Date()

  // 標記內容已修改
  autoSaveService.markAsModified()

  emit("update", localArticle.value)
  emit("update:modelValue", false)
}

function handleClose() {
  emit("update:modelValue", false)
}

// Watch for article changes
watch(
  () => props.article,
  (newArticle) => {
    if (newArticle) {
      // Create a deep copy to avoid mutating the original
      localArticle.value = JSON.parse(JSON.stringify(newArticle))
      publishDate.value = newArticle.frontmatter.date || new Date().toISOString().split("T")[0]
      categoryInput.value = newArticle.category || ""
      
      // Ensure keywords array exists
      if (!localArticle.value!.frontmatter.keywords) {
        localArticle.value!.frontmatter.keywords = []
      }
    }
  },
  { immediate: true }
)

// Watch for dialog open/close
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen && props.article) {
      // Reset local article when dialog opens
      localArticle.value = JSON.parse(JSON.stringify(props.article))
      publishDate.value = props.article.frontmatter.date || new Date().toISOString().split("T")[0]
      categoryInput.value = props.article.category || ""
      // 載入分類清單（每次開啟同步一次，確保拿到最新 cache）
      allCategories.value = metadataCacheService.getCategories()
    }
  }
)
</script>

<style scoped>
/* Custom styles if needed */
</style>