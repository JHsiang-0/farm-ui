<template>
  <t-drawer
    :visible="modelValue"
    header="任务详情"
    size="460px"
    :destroy-on-close="true"
    @update:visible="handleVisibleChange"
  >
    <div v-if="loading" class="p-4">
      <t-skeleton :loading="true" theme="article" />
    </div>
    <div v-else-if="task" class="p-4 space-y-5">
      <t-alert v-if="error" theme="error" :title="error" :close-btn="false" />
      <t-descriptions bordered :column="1" size="small">
        <t-descriptions-item label="任务 ID">#{{ task.id }}</t-descriptions-item>
        <t-descriptions-item label="文件 ID">{{ formatValue(task.fileId) }}</t-descriptions-item>
        <t-descriptions-item label="打印机 ID">{{ formatValue(task.printerId) }}</t-descriptions-item>
        <t-descriptions-item label="发起用户 ID">{{ formatValue(task.userId) }}</t-descriptions-item>
        <t-descriptions-item label="现场操作员 ID">{{ formatValue(task.operatorId) }}</t-descriptions-item>
        <t-descriptions-item label="状态">
          <t-tag :theme="statusTheme(task.status)">{{ statusLabel(task.status) }}</t-tag>
        </t-descriptions-item>
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
          <span class="text-red-600">{{ task.errorReason }}</span>
        </t-descriptions-item>
      </t-descriptions>

      <t-card title="已知时间线" bordered>
        <t-timeline>
          <t-timeline-item v-if="hasValue(task.createdAt)" label="任务创建">
            {{ formatDateTime(task.createdAt) }}
          </t-timeline-item>
          <t-timeline-item v-if="hasValue(task.startedAt)" label="开始执行">
            {{ formatDateTime(task.startedAt) }}
          </t-timeline-item>
          <t-timeline-item v-if="hasValue(task.completedAt)" label="任务完成">
            {{ formatDateTime(task.completedAt) }}
          </t-timeline-item>
          <t-timeline-item v-if="hasValue(task.updatedAt)" label="最近更新">
            {{ formatDateTime(task.updatedAt) }}
          </t-timeline-item>
        </t-timeline>
        <t-empty v-if="!hasValue(task.createdAt) && !hasValue(task.startedAt) && !hasValue(task.completedAt) && !hasValue(task.updatedAt)" description="暂无时间记录" />
      </t-card>
    </div>
    <t-empty v-else description="未选择任务" />
  </t-drawer>
</template>

<script setup>
import { formatDateTime } from '@/utils/formatters'

defineProps({
  modelValue: { type: Boolean, default: false },
  task: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const handleVisibleChange = value => emit('update:modelValue', value)

const hasValue = value => value !== undefined && value !== null && value !== ''
const formatValue = value => hasValue(value) ? value : '-'

const statusLabels = {
  UPLOADING: '上传中', QUEUED: '排队中', ASSIGNED: '已分配', READY: '待启动', PRINTING: '打印中',
  PAUSED: '已暂停', COMPLETED: '已完成', FAILED: '失败', RECONCILING: '状态核对中', CANCELLED: '已取消'
}

const statusLabel = status => statusLabels[status] || status || '未知'
const statusTheme = status => ({ PRINTING: 'success', FAILED: 'danger', PAUSED: 'warning', RECONCILING: 'warning' }[status] || 'default')
</script>
