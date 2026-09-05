<template>
  <t-tag
    :theme="status.theme"
    :variant="variant"
    :size="size"
    :title="status.description"
    class="app-status-tag"
  >
    <component :is="status.icon" v-if="showIcon" class="app-status-tag__icon" aria-hidden="true" />
    <span>{{ status.label }}</span>
  </t-tag>
</template>

<script setup>
import { computed } from 'vue'
import { getStatusView } from '@/utils/statusView'

defineOptions({ name: 'StatusTag' })

const props = defineProps({
  domain: { type: String, default: 'job' },
  status: { type: [String, Number], default: '' },
  variant: { type: String, default: 'light' },
  size: { type: String, default: 'small' },
  showIcon: { type: Boolean, default: true }
})

const status = computed(() => getStatusView(props.domain, props.status))
</script>

