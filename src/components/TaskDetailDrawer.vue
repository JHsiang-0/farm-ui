<template>
  <t-drawer v-model:visible="visible" header="任务详情" size="420px" @close="close">
    <template v-if="task">
      <t-descriptions bordered :column="1" size="small">
        <t-descriptions-item label="任务 ID">#{{ task.id }}</t-descriptions-item>
        <t-descriptions-item label="文件 ID">{{ task.fileId || '-' }}</t-descriptions-item>
        <t-descriptions-item label="打印机 ID">{{ task.printerId || '未分配' }}</t-descriptions-item>
        <t-descriptions-item label="状态">
          <t-tag :theme="statusTheme(task.status)">{{ statusLabel(task.status) }}</t-tag>
        </t-descriptions-item>
        <t-descriptions-item label="优先级">{{ priorityLabel(task.priority) }}</t-descriptions-item>
        <t-descriptions-item label="进度">
          <t-progress :percentage="task.progress || 0" />
        </t-descriptions-item>
        <t-descriptions-item label="创建时间">{{ formatDateTime(task.createdAt) }}</t-descriptions-item>
        <t-descriptions-item label="更新时间">{{ formatDateTime(task.updatedAt) }}</t-descriptions-item>
        <t-descriptions-item v-if="task.errorReason" label="错误原因">
          <span class="text-red-600">{{ task.errorReason }}</span>
        </t-descriptions-item>
      </t-descriptions>
    </template>
  </t-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { formatDateTime } from '@/utils/formatters'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  task: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue'])
const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const statusLabels = {
  QUEUED: '排队中', ASSIGNED: '已分配', READY: '待启动', PRINTING: '打印中',
  PAUSED: '已暂停', COMPLETED: '已完成', FAILED: '失败', CANCELLED: '已取消'
}

const statusLabel = status => statusLabels[status] || status || '未知'
const statusTheme = status => ({ PRINTING: 'success', FAILED: 'danger', PAUSED: 'warning' }[status] || 'default')
const priorityLabel = priority => ({ 0: '普通', 1: '优先', 2: '加急' }[priority] || String(priority ?? '普通'))
const close = () => emit('update:modelValue', false)
</script>
