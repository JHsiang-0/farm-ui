<template>
  <!-- 始终保留单一根节点，避免状态切换后组件变成无根节点并触发卸载异常。 -->
  <div class="async-state" :class="{ 'async-state--with-data': hasData }" role="status" aria-live="polite">
    <div v-if="loading" class="async-state__loading">
      <t-loading :text="loadingText" />
    </div>
    <t-alert v-else-if="error" theme="error" :close-btn="false" class="async-state__error">
      <template #default>{{ errorMessage }}</template>
      <template #operation>
        <t-button size="small" variant="outline" @click="$emit('retry')">{{ retryText }}</t-button>
      </template>
    </t-alert>
    <t-empty v-else-if="empty" :description="emptyDescription" class="async-state__empty">
      <template #operation>
        <t-button size="small" variant="outline" @click="$emit('retry')">{{ retryText }}</t-button>
      </template>
    </t-empty>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getAsyncErrorMessage } from '@/utils/asyncState'

defineOptions({ name: 'AsyncState' })

const props = defineProps({
  loading: { type: Boolean, default: false },
  error: { type: [String, Error, Object], default: null },
  empty: { type: Boolean, default: false },
  hasData: { type: Boolean, default: false },
  emptyDescription: { type: String, default: '暂无数据' },
  loadingText: { type: String, default: '加载中...' },
  retryText: { type: String, default: '重试' }
})

defineEmits(['retry'])

const errorMessage = computed(() => getAsyncErrorMessage(props.error))
</script>
