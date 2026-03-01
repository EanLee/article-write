<template>
  <div class="image-manager">
    <!-- Image Manager Header -->
    <div class="bg-base-200 border-b border-base-300 p-4">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-lg font-semibold">圖片管理</h3>
        <div class="flex gap-2">
          <button 
            class="btn btn-sm btn-primary"
            @click="showImageBrowser = true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            插入圖片
          </button>
          <button 
            class="btn btn-sm btn-outline"
            @click="refreshImages"
            :disabled="loading"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重新整理
          </button>
          <button 
            class="btn btn-sm btn-warning"
            @click="cleanupUnusedImages"
            :disabled="loading || unusedImagesCount === 0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            清理未使用 ({{ unusedImagesCount }})
          </button>
        </div>
      </div>
      
      <!-- Search and Filter -->
      <div class="flex gap-2">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜尋圖片..."
          class="input input-bordered input-sm flex-1"
          @input="filterImages"
        />
        <select
          v-model="filterType"
          class="select select-bordered select-sm"
          @change="filterImages"
        >
          <option value="all">全部圖片</option>
          <option value="used">已使用</option>
          <option value="unused">未使用</option>
          <option value="invalid">無效引用</option>
        </select>
      </div>
    </div>

    <!-- Images in Current Article -->
    <div v-if="currentArticleImages.length > 0" class="p-4 border-b border-base-300">
      <h4 class="text-sm font-semibold mb-3 text-base-content/70">目前文章中的圖片</h4>
      <div class="grid grid-cols-2 gap-2">
        <div
          v-for="image in currentArticleImages"
          :key="image.name"
          class="card bg-base-100 shadow-sm border"
          :class="{ 'border-error': !image.exists }"
        >
          <div class="card-body p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium truncate" :title="image.name">{{ image.name }}</span>
              <div class="flex gap-1">
                <div 
                  class="badge badge-xs"
                  :class="image.exists ? 'badge-success' : 'badge-error'"
                >
                  {{ image.exists ? '存在' : '缺失' }}
                </div>
              </div>
            </div>
            
            <!-- Image Preview -->
            <div class="aspect-video bg-base-200 rounded overflow-hidden mb-2">
              <img
                v-if="image.exists && image.preview"
                :src="image.preview"
                :alt="image.name"
                class="w-full h-full object-cover"
                @error="handleImageError(image)"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-base-content/50">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex gap-1">
              <button
                v-if="!image.exists"
                class="btn btn-xs btn-error flex-1"
                @click="removeImageReference(image.name)"
              >
                移除引用
              </button>
              <button
                v-else
                class="btn btn-xs btn-outline flex-1"
                @click="copyImagePath(image.name)"
              >
                複製路徑
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- All Available Images -->
    <div class="flex-1 overflow-y-auto p-4">
      <div class="flex justify-between items-center mb-3">
        <h4 class="text-sm font-semibold text-base-content/70">
          可用圖片 ({{ filteredImages.length }}/{{ allImages.length }})
        </h4>
        <div class="text-xs text-base-content/50">
          {{ getStorageInfo() }}
        </div>
      </div>
      
      <div v-if="loading" class="flex justify-center items-center h-32">
        <span class="loading loading-spinner loading-md"></span>
      </div>
      
      <div v-else-if="filteredImages.length === 0" class="text-center py-8 text-base-content/50">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>沒有找到圖片</p>
      </div>
      
      <div v-else class="grid grid-cols-2 gap-3">
        <div
          v-for="image in filteredImages"
          :key="image.name"
          class="card bg-base-100 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
          @click="selectImage(image)"
        >
          <div class="card-body p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium truncate" :title="image.name">{{ image.name }}</span>
              <div class="flex gap-1">
                <div 
                  class="badge badge-xs"
                  :class="image.isUsed ? 'badge-info' : 'badge-ghost'"
                >
                  {{ image.isUsed ? '已使用' : '未使用' }}
                </div>
              </div>
            </div>
            
            <!-- Image Preview -->
            <div class="aspect-video bg-base-200 rounded overflow-hidden mb-2">
              <img
                v-if="image.preview"
                :src="image.preview"
                :alt="image.name"
                class="w-full h-full object-cover"
                @error="handleImageError(image)"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-base-content/50">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            
            <!-- Image Info -->
            <div class="text-xs text-base-content/70 mb-2">
              <div>{{ formatFileSize(image.size) }}</div>
              <div>{{ formatDate(image.lastModified) }}</div>
            </div>
            
            <!-- Actions -->
            <div class="flex gap-1">
              <button
                class="btn btn-xs btn-primary flex-1"
                @click.stop="insertImageReference(image.name)"
              >
                插入
              </button>
              <button
                v-if="!image.isUsed"
                class="btn btn-xs btn-error"
                @click.stop="deleteUnusedImage(image.name)"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Browser Modal -->
    <div v-if="showImageBrowser" class="modal modal-open">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg mb-4">選擇圖片</h3>
        
        <!-- Upload Area -->
        <div 
          class="border-2 border-dashed border-base-300 rounded-lg p-6 mb-4 text-center transition-colors"
          :class="{ 'border-primary bg-primary/5': isDragOver }"
          @dragover.prevent="handleDragOver"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*"
            class="hidden"
            @change="handleFileUpload"
          />
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="text-base-content/70 mb-2">
            {{ isDragOver ? '放開以上傳圖片' : '拖放圖片到此處或' }}
          </p>
          <button
            v-if="!isDragOver"
            class="btn btn-outline btn-sm"
            @click="fileInput?.click()"
          >
            選擇檔案
          </button>
        </div>
        
        <!-- Image Grid -->
        <div class="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto">
          <div
            v-for="image in allImages"
            :key="image.name"
            class="card bg-base-100 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
            :class="{ 'ring-2 ring-primary': selectedImageForBrowser === image.name }"
            @click="selectedImageForBrowser = image.name"
          >
            <div class="card-body p-2">
              <div class="aspect-square bg-base-200 rounded overflow-hidden mb-1">
                <img
                  v-if="image.preview"
                  :src="image.preview"
                  :alt="image.name"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-base-content/50">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div class="text-xs truncate" :title="image.name">{{ image.name }}</div>
            </div>
          </div>
        </div>
        
        <div class="modal-action">
          <button class="btn" @click="showImageBrowser = false">取消</button>
          <button
            class="btn btn-primary"
            @click="insertSelectedImage"
            :disabled="!selectedImageForBrowser"
          >
            插入圖片
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useArticleStore } from "@/stores/article"
import { useConfigStore } from "@/stores/config"
import { useImageService } from "@/composables/useServices"
import type { ImageInfo } from "@/services/ImageService"

// Props and Emits
const emit = defineEmits<{
  insertImage: [imageName: string]
  removeImageReference: [imageName: string]
}>()

// Stores and Services
const articleStore = useArticleStore()
const configStore = useConfigStore()
const imageService = useImageService()

// Reactive data
const loading = ref(false)
const showImageBrowser = ref(false)
const selectedImageForBrowser = ref<string>("")
const searchQuery = ref("")
const filterType = ref<"all" | "used" | "unused" | "invalid">("all")
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)

// Image data
const allImages = ref<ImageInfo[]>([])
const filteredImages = ref<ImageInfo[]>([])

// Computed properties for image statistics
const unusedImagesCount = computed(() => 
  allImages.value.filter(image => !image.isUsed).length
)

// Computed properties
interface CurrentArticleImage {
  name: string
  exists: boolean
  preview?: string
}

const currentArticleImages = computed(() => {
  if (!articleStore.currentArticle) {
    return []
  }
  
  const images: CurrentArticleImage[] = []
  
  // Use ImageService to get image references for better accuracy
  const references = imageService.getArticleImageReferences(articleStore.currentArticle)
  
  references.forEach(ref => {
    const imageInfo = allImages.value.find(img => img.name === ref.imageName)
    
    images.push({
      name: ref.imageName,
      exists: !!imageInfo,
      preview: imageInfo?.preview
    })
  })
  
  // Remove duplicates (same image referenced multiple times)
  const uniqueImages = images.filter((image, index, self) => 
    index === self.findIndex(img => img.name === image.name)
  )
  
  return uniqueImages
})

// Methods
async function loadImages() {
  loading.value = true
  try {
    const vaultPath = configStore.config.paths.obsidianVault
    if (!vaultPath) {
      allImages.value = []
      return
    }
    
    // Update image service with current vault path and articles
    imageService.setVaultPath(vaultPath)
    imageService.updateArticles(articleStore.articles)
    
    // Load images using the service
    const images = await imageService.loadImages()
    allImages.value = images
    filterImages()
  } catch (error) {
     
    console.error("Failed to load images:", error)
    allImages.value = []
  } finally {
    loading.value = false
  }
}

function isImageUsed(imageName: string): boolean {
  return imageService.isImageUsed(imageName)
}

function filterImages() {
  let filtered = [...allImages.value]
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(image => 
      image.name.toLowerCase().includes(query)
    )
  }
  
  // Apply type filter
  switch (filterType.value) {
    case "used":
      filtered = filtered.filter(image => image.isUsed)
      break
    case "unused":
      filtered = filtered.filter(image => !image.isUsed)
      break
    case "invalid":
      // This would be images referenced but not found
      // For now, we don't have invalid images in allImages
      filtered = []
      break
  }
  
  filteredImages.value = filtered
}

function selectImage(image: ImageInfo) {
  selectedImageForBrowser.value = image.name
}

function insertImageReference(imageName: string) {
  emit("insertImage", imageName)
}

function insertSelectedImage() {
  if (selectedImageForBrowser.value) {
    emit("insertImage", selectedImageForBrowser.value)
    showImageBrowser.value = false
    selectedImageForBrowser.value = ""
  }
}

function removeImageReference(imageName: string) {
  emit("removeImageReference", imageName)
}

async function deleteUnusedImage(imageName: string) {
  if (!confirm(`確定要刪除圖片 "${imageName}" 嗎？此操作無法復原。`)) {
    return
  }
  
  try {
    const success = await imageService.deleteUnusedImage(imageName)
    if (success) {
      // Remove from local array
      const index = allImages.value.findIndex(img => img.name === imageName)
      if (index !== -1) {
        allImages.value.splice(index, 1)
        filterImages()
      }
    } else {
      alert("刪除圖片失敗")
    }
  } catch (error) {
     
    console.error("Failed to delete image:", error)
    alert("刪除圖片失敗: " + (error as Error).message)
  }
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) {
    return
  }
  
  loading.value = true
  
  try {
    const vaultPath = configStore.config.paths.obsidianVault
    if (!vaultPath) {
      alert("請先設定 Obsidian Vault 路徑")
      return
    }
    
    const uploadResults: { success: string[], failed: string[] } = { success: [], failed: [] }
    
    for (const file of files) {
      try {
        const fileName = await imageService.uploadImageFile(file)
        uploadResults.success.push(fileName)
      } catch (error) {
         
        console.error("Failed to upload image:", error)
        uploadResults.failed.push(file.name)
      }
    }
    
    // Show results
    if (uploadResults.success.length > 0) {
      const successMessage = `成功上傳 ${uploadResults.success.length} 個圖片檔案`
      if (uploadResults.failed.length > 0) {
        alert(`${successMessage}\n失敗: ${uploadResults.failed.join(", ")}`)
      } else {
        // Could show a toast notification here instead of alert
        // For now, we'll just refresh the list
      }
    } else if (uploadResults.failed.length > 0) {
      alert(`上傳失敗: ${uploadResults.failed.join(", ")}`)
    }
    
    // Refresh the image list
    await loadImages()
  } catch (error) {
     
    console.error("Failed to handle file upload:", error)
    alert("上傳圖片時發生錯誤")
  } finally {
    loading.value = false
    // Clear the input
    target.value = ""
  }
}

function copyImagePath(imageName: string) {
  const path = imageService.generateImageReference(imageName)
  navigator.clipboard.writeText(path).then(() => {
    // Could show a toast notification here
  }).catch(err => {
     
    console.error("Failed to copy to clipboard:", err)
  })
}

function handleImageError(image: ImageInfo | CurrentArticleImage) {
  image.preview = undefined
}

function refreshImages() {
  loadImages()
}

async function cleanupUnusedImages() {
  const unusedImages = allImages.value.filter(image => !image.isUsed)
  
  if (unusedImages.length === 0) {
    return
  }
  
  const confirmMessage = `確定要刪除 ${unusedImages.length} 個未使用的圖片嗎？\n\n${unusedImages.map(img => img.name).join("\n")}\n\n此操作無法復原。`
  
  if (!confirm(confirmMessage)) {
    return
  }
  
  loading.value = true
  
  try {
    const cleanedFiles = await imageService.cleanupUnusedImages()
    
    if (cleanedFiles.length > 0) {
      alert(`成功清理 ${cleanedFiles.length} 個未使用的圖片檔案`)
      
      // Remove cleaned files from local array
      allImages.value = allImages.value.filter(img => !cleanedFiles.includes(img.name))
      filterImages()
    } else {
      alert("沒有圖片被清理")
    }
  } catch (error) {
     
    console.error("Failed to cleanup unused images:", error)
    alert("清理圖片時發生錯誤: " + (error as Error).message)
  } finally {
    loading.value = false
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "未知大小"
  }
  
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date)
}

function getStorageInfo(): string {
  const totalSize = allImages.value.reduce((sum, img) => sum + img.size, 0)
  return `總計 ${formatFileSize(totalSize)}`
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
}

async function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) {
    return
  }
  
  // Filter for image files only
  const imageFiles = Array.from(files).filter(file => 
    file.type.startsWith("image/")
  )
  
  if (imageFiles.length === 0) {
    alert("請拖放圖片檔案")
    return
  }
  
  // Create a fake event to reuse the existing upload logic
  const fakeEvent = {
    target: {
      files: imageFiles,
      value: ""
    }
  } as unknown as Event
  
  await handleFileUpload(fakeEvent)
}

// Watchers
// 使用淺層監聽 articles.length，避免深層監聽的效能問題
// 圖片使用狀態會在文章新增/刪除時更新
watch(() => articleStore.articles.length, () => {
  // Update usage status when articles change
  allImages.value.forEach(image => {
    image.isUsed = isImageUsed(image.name)
  })
  filterImages()
})

watch(() => configStore.config.paths.obsidianVault, () => {
  loadImages()
})

// Lifecycle
onMounted(() => {
  loadImages()
})
</script>

<style scoped>
.image-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Custom scrollbar for image grid */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>