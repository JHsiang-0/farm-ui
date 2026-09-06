<template>
  <t-drawer
    v-model:visible="drawerVisible"
    :destroy-on-close="true"
    :close-btn="false"
    :close-on-esc-keydown="true"
    size="460px"
    class="task-detail-drawer"
    @close="handleClose"
  >
    <template #header>
      <div class="task-detail-drawer__header">
        <span class="task-detail-drawer__title">任务详情</span>
        <t-button variant="text" shape="square" aria-label="关闭任务详情" @click="handleClose">
          <Close />
        </t-button>
      </div>
    </template>

    <div class="task-detail-drawer__body">
      <div v-if="loading" class="task-detail-drawer__loading">
        <t-skeleton :loading="true" theme="article" />
      </div>
      <template v-else-if="task">
        <t-alert v-if="error" theme="error" :title="error" :close-btn="false" />
        <t-descriptions bordered :column="1" size="small">
          <t-descriptions-item label="任务 ID">#{{ task.id }}</t-descriptions-item>
          <t-descriptions-item label="文件 ID">{{ formatValue(task.fileId) }}</t-descriptions-item>
          <t-descriptions-item label="打印机 ID">{{ formatValue(task.printerId) }}</t-descriptions-item>
          <t-descriptions-item label="发起用户 ID">{{ formatValue(task.userId) }}</t-descriptions-item>
          <t-descriptions-item label="现场操作员 ID">{{ formatValue(task.operatorId) }}</t-descriptions-item>
          <t-descriptions-item label="状态"><StatusTag domain="job" :status="task.status" /></t-descriptions-item>
          <t-descriptions-item label="优先级">{{ formatValue(task.priority) }}</t-descriptions-item>
          <t-descriptions-item label="进度">
            <t-progress v-if="hasValue(task.progress)" :percentage="task.progress" />
            <span v-else>-</span>
          </t-descriptions-item>
          <t-descriptions-item label="创建时间">{{ formatDateTime(task.createdAt) }}</t-descriptions-item>
          <t-descriptions-item label="开始时间">{{ formatDateTime(task.startedAt) }}</t-descriptions-item>
          <t-descriptions-item label="完成时间">{{ formatDateTime(task.completedAt) }}</t-descriptions-item>
          <t-descriptions-item label="更新时间">{{ formatDateTime(task.updatedAt) }}</t-descriptions-item>
          <t-descriptions-item v-if="hasValue(task.errorReason)" label="失败/核对原因">
            <span class="task-detail-drawer__error">{{ task.errorReason }}</span>
          </t-descriptions-item>
        </t-descriptions>

        <section class="task-detail-drawer__timeline" aria-labelledby="task-detail-timeline">
          <h2 id="task-detail-timeline">已知时间线</h2>
          <t-timeline>
            <t-timeline-item v-if="hasValue(task.createdAt)" label="任务创建">{{ formatDateTime(task.createdAt) }}</t-timeline-item>
            <t-timeline-item v-if="hasValue(task.startedAt)" label="开始执行">{{ formatDateTime(task.startedAt) }}</t-timeline-item>
            <t-timeline-item v-if="hasValue(task.completedAt)" label="任务完成">{{ formatDateTime(task.completedAt) }}</t-timeline-item>
            <t-timeline-item v-if="hasValue(task.updatedAt)" label="最近更新">{{ formatDateTime(task.updatedAt) }}</t-timeline-item>
          </t-timeline>
          <t-empty
            v-if="!hasValue(task.createdAt) && !hasValue(task.startedAt) && !hasValue(task.completedAt) && !hasValue(task.updatedAt)"
            description="暂无时间记录"
          />
        </section>
      </template>
      <t-empty v-else description="未选择任务" />
    </div>
  </t-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { CloseIcon as Close } from 'tdesign-icons-vue-next'
import { formatDateTime } from '@/utils/formatters'
import StatusTag from './StatusTag.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  task: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const drawerVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const handleClose = () => {
  if (props.modelValue) emit('update:modelValue', false)
}

const hasValue = value => value !== undefined && value !== null && value !== ''
const formatValue = value => hasValue(value) ? value : '-'
</script>

<style scoped>
.task-detail-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.task-detail-drawer__title {
  color: var(--app-text-primary);
  font-size: var(--td-font-size-title-medium);
  font-weight: 700;
}

.task-detail-drawer__body {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: var(--app-spacing-4);
}

.task-detail-drawer__loading {
  padding: var(--app-spacing-2);
}

.task-detail-drawer__timeline {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-3);
  padding-top: var(--app-spacing-2);
  border-top: 1px solid var(--app-border);
}

.task-detail-drawer__timeline h2 {
  margin: 0;
  color: var(--app-text-primary);
  font-size: var(--td-font-size-title-small);
}

.task-detail-drawer__error {
  color: var(--td-error-color);
}
</style>
