<template>
  <el-drawer
    v-model="visible"
    title="文件详情"
    size="520px"
    :destroy-on-close="true"
    class="file-detail-drawer"
    @closed="handleClosed"
  >
    <div v-if="file" class="p-4">
      <!-- 顶部区域 -->
      <div class="flex items-start gap-4 mb-6">
        <!-- 缩略图 -->
        <div class="w-24 h-24 rounded-lg border border-gray-200 overflow-hidden bg-gray-100 flex-shrink-0">
          <el-image
            v-if="file.thumbnail_url"
            :src="file.thumbnail_url"
            fit="cover"
            class="w-full h-full"
          >
            <template #error>
              <div class="w-full h-full flex items-center justify-center text-gray-500">
                <IconCube />
              </div>
            </template>
          </el-image>
          <div v-else class="w-full h-full flex items-center justify-center text-gray-500">
            <IconCube />
          </div>
        </div>

        <!-- 文件信息 -->
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-bold text-gray-900 mb-2 truncate" :title="file.original_name">
            {{ file.original_name }}
          </h2>
          <el-tag :type="getMaterialTagType(file.material_type)" class="mr-2">
            {{ file.material_type || 'PLA' }}
          </el-tag>
        </div>

        <!-- 操作按钮 -->
        <div class="flex flex-col gap-2">
          <el-button type="primary" size="default" @click="handleDownload">
            <el-icon><Download /></el-icon>
            下载 G-Code
          </el-button>
        </div>
      </div>

      <!-- 核心数据看板 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 text-gray-600 mb-1">
            <IconClock />
            <span class="text-xs font-medium">预估耗时</span>
          </div>
          <span class="text-lg font-bold text-gray-900">{{ formatEstTime(file.est_time) }}</span>
        </div>

        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 text-gray-600 mb-1">
            <IconWeight />
            <span class="text-xs font-medium">耗材重量</span>
          </div>
          <span class="text-lg font-bold text-gray-900">{{ formatWeight(file.filament_weight) }}</span>
        </div>

        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 text-gray-600 mb-1">
            <IconLength />
            <span class="text-xs font-medium">所需线长</span>
          </div>
          <span class="text-lg font-bold text-gray-900">{{ formatLength(file.filament_length) }}</span>
        </div>

        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 text-gray-600 mb-1">
            <IconNozzle />
            <span class="text-xs font-medium">喷嘴要求</span>
          </div>
          <span class="text-lg font-bold text-gray-900">{{ formatNozzle(file.nozzle_size) }}</span>
        </div>
      </div>

      <!-- 参数详情面板 -->
      <div class="space-y-6">
        <!-- 温度与层高 -->
        <el-card class="border-gray-200">
          <template #header>
            <div class="flex items-center gap-2">
              <IconTemperature />
              <span class="text-sm font-semibold text-gray-900">温度与层高控制</span>
            </div>
          </template>
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item label="常规层高">
              {{ formatHeight(file.layer_height) }}
            </el-descriptions-item>
            <el-descriptions-item label="首层层高">
              {{ formatHeight(file.first_layer_height) }}
            </el-descriptions-item>
            <el-descriptions-item label="喷嘴温度">
              {{ formatTemperature(file.nozzle_temp) }}
            </el-descriptions-item>
            <el-descriptions-item label="首层喷嘴温度">
              {{ formatTemperature(file.first_layer_nozzle_temp) }}
            </el-descriptions-item>
            <el-descriptions-item label="热床温度">
              {{ formatTemperature(file.bed_temp) }}
            </el-descriptions-item>
            <el-descriptions-item label="首层热床温度">
              {{ formatTemperature(file.first_layer_bed_temp) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 系统与文件元数据 -->
        <el-card class="border-gray-200">
          <template #header>
            <div class="flex items-center gap-2">
              <IconInfo />
              <span class="text-sm font-semibold text-gray-900">系统与文件元数据</span>
            </div>
          </template>
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="文件大小">
              {{ formatFileSize(file.file_size) }}
            </el-descriptions-item>
            <el-descriptions-item label="上传时间">
              {{ formatDateTime(file.created_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="系统存储名">
              <span class="text-xs text-gray-600 font-mono">{{ file.safe_name }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="上传用户ID">
              {{ file.user_id || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="flex flex-col items-center justify-center py-16 text-gray-500">
      <el-icon size="48" class="mb-4">
        <Document />
      </el-icon>
      <p>未选择文件</p>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { Download, Document } from '@element-plus/icons-vue'
import IconCube from '../icons/IconCube.vue'
import IconClock from '../icons/IconClock.vue'
import IconWeight from '../icons/IconWeight.vue'
import IconLength from '../icons/IconLength.vue'
import IconNozzle from '../icons/IconNozzle.vue'
import IconTemperature from '../icons/IconTemperature.vue'
import IconInfo from '../icons/IconInfo.vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  file: {
    type: Object,
    default: () => ({})
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'download', 'closed'])

// Computed
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Methods
const handleDownload = () => {
  emit('download', props.file)
}

const handleClosed = () => {
  emit('closed')
}

const formatEstTime = (seconds) => {
  if (!seconds) return '未知'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) {
    return `${h}h ${m}m`
  }
  return `${m}m`
}

const formatWeight = (grams) => {
  if (grams === undefined || grams === null) return '-'
  return `${grams.toFixed(1)}g`
}

const formatLength = (millimeters) => {
  if (millimeters === undefined || millimeters === null) return '-'
  const meters = millimeters / 1000
  return `${meters.toFixed(2)}m`
}

const formatNozzle = (millimeters) => {
  if (millimeters === undefined || millimeters === null) return '-'
  return `${millimeters.toFixed(1)}mm`
}

const formatHeight = (millimeters) => {
  if (millimeters === undefined || millimeters === null) return '-'
  return `${millimeters.toFixed(2)}mm`
}

const formatTemperature = (celsius) => {
  if (celsius === undefined || celsius === null) return '-'
  return `${celsius.toFixed(0)}°C`
}

const formatFileSize = (bytes) => {
  if (!bytes) return '-'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const getMaterialTagType = (materialType) => {
  const types = {
    PLA: 'success',
    ABS: 'warning',
    PETG: 'primary',
    TPU: 'info',
    尼龙: 'danger'
  }
  return types[materialType] || 'info'
}
</script>

<style scoped>
:deep(.el-drawer__body) {
  padding: 0;
  overflow-y: auto;
}

:deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.file-detail-drawer {
  padding: 0;
}
</style>
