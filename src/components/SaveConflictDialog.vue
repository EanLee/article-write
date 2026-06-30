<template>
  <div v-if="conflictState" class="modal modal-open">
    <div class="modal-box max-w-md">
      <h3 class="font-bold text-lg mb-2">儲存衝突</h3>
      <p class="text-sm text-base-content/80">
        檔案「{{ conflictState.article.title }}」在外部被修改，與目前編輯器內容不一致。
      </p>
      <p v-if="modifiedTimeText" class="text-sm text-base-content/60 mt-1">
        外部修改時間：{{ modifiedTimeText }}
      </p>
      <p class="text-sm text-base-content/80 mt-3">
        請選擇要保留的版本：重新載入將捨棄編輯器中的變更，覆寫將以編輯器內容取代磁碟上的外部修改。
      </p>

      <div class="modal-action">
        <button class="btn" @click="articleStore.resolveConflictCancel()">取消</button>
        <button class="btn btn-outline" @click="articleStore.resolveConflictReload()">重新載入</button>
        <button class="btn btn-warning" @click="articleStore.resolveConflictOverwrite()">覆寫</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useArticleStore } from "@/stores/article"

const articleStore = useArticleStore()
const conflictState = computed(() => articleStore.conflictState)

const modifiedTimeText = computed(() => {
  const time = conflictState.value?.fileModifiedTime
  return time ? new Date(time).toLocaleString() : ""
})
</script>
