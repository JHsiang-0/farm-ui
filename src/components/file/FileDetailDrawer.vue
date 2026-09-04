<template>
  <t-drawer :visible="modelValue" header="文件详情"
    size="520px"
    :destroy-on-close="true"
    :footer="false"
    class="file-detail-drawer"
    @update:visible="handleVisibleChange"
  >
    <div v-if="loading" class="p-4">
      <t-skeleton :loading="true" theme="article" />
    </div>

    <div v-else-if="file" class="p-4">
      <t-alert v-if="error" theme="error" :title="error" :closable="false" class="mb-4" />
      <!-- 顶部区域 -->
      <div class="flex items-start gap-4 mb-6">
        <!-- 缩略图 -->
        <div class="w-24 h-24 rounded-lg border border-gray-200 overflow-hidden bg-gray-100 flex-shrink-0">
          <t-image
            v-if="file.thumbnailUrl"
            :src="file.thumbnailUrl"
            fit="cover"
            class="w-full h-full"
          >
            <template #error>
              <div class="w-full h-full flex items-center justify-center text-gray-500">
                <IconCube />
              </div>
            </template>
          </t-image>
          <div v-else class="w-full h-full flex items-center justify-center text-gray-500">
            <IconCube />
          </div>
        </div>

        <!-- 文件信息 -->
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-bold text-gray-900 mb-2 truncate" :title="file.originalName">
            {{ file.originalName }}
          </h2>
          <t-tag :theme="getMaterialTagType(file.materialType)" class="mr-2">
            {{ file.materialType || 'PLA' }}
          </t-tag>
        </div>

        <!-- 操作按钮 -->
        <div class="flex flex-col gap-2">
          <t-button theme="success" size="medium" @click="handlePrint">
            <span><Printer /></span>
            打印
          </t-button>
          <t-button theme="primary" size="medium" @click="handleDownload">
            <span><Download /></span>
            下载 G-Code
          </t-button>
        </div>
      </div>

      <!-- 核心数据看板 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 text-gray-600 mb-1">
            <IconClock />
            <span class="text-xs font-medium">预估耗时</span>
          </div>
          <span class="text-lg font-bold text-gray-900">{{ formatEstTime(file.estTime) }}</span>
        </div>

        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 text-gray-600 mb-1">
            <IconWeight />
            <span class="text-xs font-medium">耗材重量</span>
          </div>
          <span class="text-lg font-bold text-gray-900">{{ formatWeight(file.filamentWeight) }}</span>
        </div>

        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 text-gray-600 mb-1">
            <IconLength />
            <span class="text-xs font-medium">所需线长</span>
          </div>
          <span class="text-lg font-bold text-gray-900">{{ formatLength(file.filamentLength) }}</span>
        </div>

        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 text-gray-600 mb-1">
            <IconNozzle />
            <span class="text-xs font-medium">喷嘴要求</span>
          </div>
          <span class="text-lg font-bold text-gray-900">{{ formatNozzle(file.nozzleSize) }}</span>
        </div>
      </div>

      <!-- 参数详情面板 -->
      <div class="space-y-6">
        <!-- 温度与层高 -->
        <t-card class="border-gray-200">
          <template #header>
            <div class="flex items-center gap-2">
              <IconTemperature />
              <span class="text-sm font-semibold text-gray-900">温度与层高控制</span>
            </div>
          </template>
          <t-descriptions :column="2" size="small" bordered>
            <t-descriptions-item label="常规层高">
              {{ formatHeight(file.layerHeight) }}
            </t-descriptions-item>
            <t-descriptions-item label="首层层高">
              {{ formatHeight(file.firstLayerHeight) }}
            </t-descriptions-item>
            <t-descriptions-item label="喷嘴温度">
              {{ formatTemperature(file.nozzleTemp) }}
            </t-descriptions-item>
            <t-descriptions-item label="首层喷嘴温度">
              {{ formatTemperature(file.firstLayerNozzleTemp) }}
            </t-descriptions-item>
            <t-descriptions-item label="热床温度">
              {{ formatTemperature(file.bedTemp) }}
            </t-descriptions-item>
            <t-descriptions-item label="首层热床温度">
              {{ formatTemperature(file.firstLayerBedTemp) }}
            </t-descriptions-item>
          </t-descriptions>
        </t-card>

        <!-- 系统与文件元数据 -->
        <t-card class="border-gray-200">
          <template #header>
            <div class="flex items-center gap-2">
              <IconInfo />
              <span class="text-sm font-semibold text-gray-900">系统与文件元数据</span>
            </div>
          </template>
          <t-descriptions :column="1" size="small" bordered>
            <t-descriptions-item label="文件大小">
              {{ formatFileSize(file.fileSize) }}
            </t-descriptions-item>
            <t-descriptions-item label="上传时间">
              {{ formatDateTime(file.createdAt) }}
            </t-descriptions-item>
            <t-descriptions-item label="上传用户ID">
              {{ file.userId || '-' }}
            </t-descriptions-item>
          </t-descriptions>
        </t-card>

        <!-- 关联打印任务 -->
        <t-card class="border-gray-200">
          <template #header>
            <div class="flex items-center gap-2">
              <Printer />
              <span class="text-sm font-semibold text-gray-900">关联任务</span>
            </div>
          </template>
          <t-alert v-if="jobsError" theme="error" :title="jobsError" :closable="false" />
          <t-skeleton v-else-if="jobsLoading" :loading="true" theme="paragraph" />
          <t-table
            v-else-if="jobs.length > 0"
            :data="jobs"
            :columns="jobColumns"
            row-key="id"
            size="small"
            bordered
          >
            <template #status="slotProps">
              <t-tag :theme="getJobStatusTagType(slotProps.row.status)" size="small">
                {{ slotProps.row.status || '-' }}
              </t-tag>
            </template>
            <template #createdAt="slotProps">
              {{ formatDateTime(slotProps.row.createdAt) }}
            </template>
          </t-table>
          <t-empty v-else description="暂无关联任务" />
        </t-card>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="flex flex-col items-center justify-center py-16 text-gray-500">
      <Document :size="48" class="mb-4" />
      <p>未选择文件</p>
    </div>
  </t-drawer>
</template>

<script setup>
import { DownloadIcon as Download, FileIcon as Document, PrintIcon as Printer } from 'tdesign-icons-vue-next'
import IconCube from '../icons/IconCube.vue'
import IconClock from '../icons/IconClock.vue'
import IconWeight from '../icons/IconWeight.vue'
import IconLength from '../icons/IconLength.vue'
import IconNozzle from '../icons/IconNozzle.vue'
import IconTemperature from '../icons/IconTemperature.vue'
import IconInfo from '../icons/IconInfo.vue'
import { formatDuration, formatFileSize, formatDateTime } from '@/utils/formatters'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  file: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  jobs: {
    type: Array,
    default: () => []
  },
  jobsLoading: {
    type: Boolean,
    default: false
  },
  jobsError: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'download', 'closed', 'print'])

const jobColumns = [
  { colKey: 'id', title: '任务 ID', width: 80 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '创建时间', ellipsis: true }
]

// Computed
const handleVisibleChange = (value) => {
  emit('update:modelValue', value)
  if (!value) emit('closed')
}

// Methods
const handlePrint = () => {
  emit('print', props.file)
}

const handleDownload = () => {
  emit('download', props.file)
}

const formatEstTime = (seconds) => {
  return formatDuration(seconds)
}

const formatWeight = (grams) => {
  if (grams === undefined || grams === null) return '-'
  return `${Number(grams).toFixed(1)}g`
}

const formatLength = (meters) => {
  if (meters === undefined || meters === null) return '-'
  return `${Number(meters).toFixed(2)}m`
}

const formatNozzle = (millimeters) => {
  if (millimeters === undefined || millimeters === null) return '-'
  return `${Number(millimeters).toFixed(1)}mm`
}

const formatHeight = (millimeters) => {
  if (millimeters === undefined || millimeters === null) return '-'
  return `${Number(millimeters).toFixed(2)}mm`
}

const formatTemperature = (celsius) => {
  if (celsius === undefined || celsius === null) return '-'
  return `${Number(celsius).toFixed(0)}°C`
}

const getMaterialTagType = (materialType) => {
  const types = {
    PLA: 'success',
    ABS: 'warning',
    PETG: 'primary',
    TPU: 'default',
    尼龙: 'danger'
  }
  return types[materialType] || 'default'
}

const getJobStatusTagType = (status) => {
  const types = {
    COMPLETED: 'success',
    PRINTING: 'primary',
    QUEUED: 'warning',
    ASSIGNED: 'warning',
    FAILED: 'danger',
    CANCELLED: 'default',
    PAUSED: 'warning'
  }
  return types[status] || 'default'
}
</script>
