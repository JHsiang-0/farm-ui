<template>
  <div v-if="loading" class="flex min-h-24 items-center justify-center py-8 text-gray-600">
    <t-loading :text="loadingText" />
  </div>
  <t-alert v-else-if="error" theme="error" :closable="false" class="my-2">
    <template #default>{{ errorMessage }}</template>
    <template #operation>
      <t-button size="small" variant="outline" @click="$emit('retry')">{{ retryText }}</t-button>
    </template>
  </t-alert>
  <t-empty v-else-if="empty" :description="emptyDescription">
    <template #operation>
      <t-button size="small" variant="outline" @click="$emit('retry')">{{ retryText }}</t-button>
    </template>
  </t-empty>
</template>

<script setup>
import { computed } from 'vue'
import { getAsyncErrorMessage } from '@/utils/asyncState'

defineOptions({ name: 'AsyncState' })

const props = defineProps({
  loading: { type: Boolean, default: false },
  error: { type: [String, Error, Object], default: null },
  empty: { type: Boolean, default: false },
  emptyDescription: { type: String, default: '暂无数据' },
  loadingText: { type: String, default: '加载中...' },
  retryText: { type: String, default: '重试' }
})

defineEmits(['retry'])

const errorMessage = computed(() => getAsyncErrorMessage(props.error))
</script>
