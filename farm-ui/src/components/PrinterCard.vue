<template>
  <el-card
    class="device-card"
    :class="[`status-${normalizedStatus}`, { 'dragging': isDragging }]"
    :style="cardBackgroundStyle"
    shadow="hover"
    draggable="true"
    :data-device-id="device.id"
    :data-row="rowIndex"
    :data-col="colIndex"
    @click="handleCardClick"
    @dragstart="$emit('dragstart', device, rowIndex, colIndex)"
    @dragend="$emit('dragend')"
    @dragover.prevent
    @dragenter.prevent="$emit('dragenter', rowIndex, colIndex)"
    @dragleave="$emit('dragleave')"
    @drop="$emit('drop', rowIndex, colIndex)"
  >
<!-- 卡片头部：机器编号 -->
    <div class="card-header">
      <span class="machine-number">{{ device.machineNumber || '-' }}</span>
    </div>

    <!-- 卡片内容区 -->
    <div class="card-content">
      <div class="info-row">
        <el-icon :size="12"><odometer /></el-icon>
        <span class="info-text">喷头: {{ formatTemperature(realTimeData?.nozzleTemp) }}°C</span>
      </div>
      <div class="info-row">
        <el-icon :size="12"><hot-water /></el-icon>
        <span class="info-text">热床: {{ formatTemperature(realTimeData?.bedTemp) }}°C</span>
      </div>
      <div class="info-row">
        <el-icon :size="12"><tools /></el-icon>
        <span class="info-text">喷头: {{ device.nozzleSize ? device.nozzleSize + 'mm' : '-' }}</span>
      </div>
      <div v-if="device.currentJobId" class="info-row job-info">
        <el-icon :size="12"><document /></el-icon>
        <span class="info-text">任务 #{{ device.currentJobId }}</span>
      </div>
    </div>

<!-- 卡片底部：状态 -->
    <div class="card-footer">
      <!-- 非打印状态：显示胶囊按钮 -->
      <template v-if="!isPrinting">
        <div class="status-wrapper">
          <div class="status-dot" :class="normalizedStatus"></div>
          <el-tag :type="statusType" size="small" effect="light">
            {{ statusLabel }}
          </el-tag>
        </div>
      </template>
      <!-- 打印中状态：显示实时进度 -->
      <template v-else>
        <div class="printing-status">
          <div class="progress-text">
            打印中 {{ printProgress.toFixed(1) }}%
          </div>
          <el-progress
            :percentage="printProgress"
            :stroke-width="10"
            striped
            striped-flow
            :duration="2"
            :show-text="false"
          />
        </div>
      </template>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import {
  Odometer,
  HotWater,
  Tools,
  Document
} from '@element-plus/icons-vue'

defineOptions({ name: 'PrinterCard' })

// ============================================
// Props & Emits
// ============================================

const props = defineProps({
  /** 设备数据对象 */
  device: {
    type: Object,
    required: true
  },
  /** 实时状态数据 */
  realTimeData: {
    type: Object,
    default: null
  },
  /** 行索引 */
  rowIndex: {
    type: Number,
    required: true
  },
  /** 列索引 */
  colIndex: {
    type: Number,
    required: true
  },
  /** 是否正在拖拽中 */
  isDragging: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'dragstart',
  'dragend',
  'dragenter',
  'dragleave',
  'drop',
  'click'
])

// ============================================
// Constants
// ============================================

/** 状态映射配置 */
const STATUS_MAP = {
  ONLINE: { label: '在线', type: 'success' },
  OFFLINE: { label: '离线', type: 'info' },
  PRINTING: { label: '打印中', type: 'primary' },
  ERROR: { label: '故障', type: 'danger' },
  IDLE: { label: '空闲', type: 'success' }
}

/** 状态背景色映射 - Element Plus 原生变量
 * ONLINE(在线): 浅绿色
 * IDLE(空闲/就绪): 浅青色（与 ONLINE 区分）
 * PRINTING(打印中): 浅蓝色
 * ERROR(故障): 浅红色
 * OFFLINE(离线): 浅灰色
 */
const STATUS_BG_MAP = {
  ONLINE: 'var(--el-color-success-light-8)',
  IDLE: '#e6f7ff', // 浅青色
  PRINTING: 'var(--el-color-primary-light-9)',
  ERROR: 'var(--el-color-danger-light-9)',
  OFFLINE: 'var(--el-color-info-light-9)'
}

// ============================================
// Computed Properties
// ============================================

/** 标准化状态值（小写） */
const normalizedStatus = computed(() => {
  // 优先使用 WebSocket 推送的实时状态
  const rtState = props.realTimeData?.state
  if (rtState) {
    return rtState.toLowerCase()
  }
  return props.device.status?.toLowerCase() || 'offline'
})

/** 状态标签类型 */
const statusType = computed(() => {
  // 优先使用 WebSocket 推送的实时状态
  const rtState = props.realTimeData?.state
  const status = rtState ? rtState.toUpperCase() : props.device.status
  const typeMap = {
    ONLINE: 'success',
    IDLE: 'success',
    OFFLINE: 'info',
    PRINTING: 'primary',
    ERROR: 'danger'
  }
  return typeMap[status] || 'info'
})

/** 状态显示标签 */
const statusLabel = computed(() => {
  // 优先使用 WebSocket 推送的实时状态
  const rtState = props.realTimeData?.state
  if (rtState) {
    return STATUS_MAP[rtState.toUpperCase()]?.label || rtState
  }
  return STATUS_MAP[props.device.status]?.label || props.device.status
})

/** 卡片动态背景色样式 */
const cardBackgroundStyle = computed(() => {
  // 优先使用 WebSocket 推送的实时状态
  const rtState = props.realTimeData?.state
  const status = rtState ? rtState.toUpperCase() : props.device.status
  const bgColor = STATUS_BG_MAP[status] || 'var(--el-color-info-light-9)'
  return {
    backgroundColor: bgColor,
    cursor: 'pointer'
  }
})

/** 是否正在打印中 - 优先使用 WebSocket 实时状态 */
const isPrinting = computed(() => {
  // 如果有 WebSocket 实时数据，优先使用
  if (props.realTimeData?.state) {
    return props.realTimeData.state.toLowerCase() === 'printing'
  }
  // 否则使用设备基础状态
  return props.device.status === 'PRINTING'
})

/** 实时进度 - 仅使用 WebSocket 数据 */
const printProgress = computed(() => {
  // 只使用 WebSocket 推送的实时进度
  if (props.realTimeData?.progress !== undefined && props.realTimeData?.progress !== null) {
    return props.realTimeData.progress
  }
  return 0
})

// ============================================
// Utility Functions
// ============================================

/**
 * 格式化温度显示
 * @param {number|null|undefined} temp - 温度值
 * @returns {string} 格式化后的温度字符串
 */
function formatTemperature(temp) {
  if (temp === null || temp === undefined || isNaN(temp)) {
    return '--'
  }
  return Number(temp).toFixed(1)
}

// ============================================
// Event Handlers
// ============================================

/**
 * 处理卡片点击事件
 */
function handleCardClick() {
  emit('click', props.device)
}
</script>

<style scoped>
/* ============================================
   Device Card - 设备卡片
   ============================================ */
.device-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: var(--ep-border-radius-base);
  transition: all var(--ep-transition-duration) var(--ep-transition-timing);
  cursor: grab;
  user-select: none;
}

.device-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--ep-box-shadow-medium);
}

.device-card.dragging {
  opacity: 0.5;
  cursor: grabbing;
  transform: rotate(3deg);
}

.device-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--ep-space-3);
  gap: var(--ep-space-2);
}

/* 状态样式 - 统一卡片风格，仅通过背景色区分 */
.device-card.status-offline {
  opacity: 0.85;
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.machine-number {
  font-family: 'Courier New', monospace;
  font-size: var(--ep-font-size-small);
  font-weight: var(--ep-font-weight-bold);
  color: var(--ep-text-color-primary);
}

.status-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.online {
  background-color: var(--ep-color-success);
  box-shadow: 0 0 6px var(--ep-color-success);
}

.status-dot.offline {
  background-color: var(--ep-color-info);
}

.status-dot.printing {
  background-color: var(--ep-color-primary);
  box-shadow: 0 0 6px var(--ep-color-primary);
}

.status-dot.error {
  background-color: var(--ep-color-danger);
  box-shadow: 0 0 6px var(--ep-color-danger);
}

/* 卡片内容区 */
.card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  overflow: hidden;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--ep-text-color-secondary);
}

.info-row .el-icon {
  flex-shrink: 0;
  color: var(--ep-color-primary-light-1);
}

.info-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.job-info {
  color: var(--ep-color-primary);
  font-weight: var(--ep-font-weight-medium);
}

/* 卡片底部 - 状态区域 */
.card-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: var(--ep-space-2);
  margin-top: auto;
  border-top: 1px solid var(--ep-border-color-lighter);
  gap: var(--ep-space-1);
}

.card-footer .status-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* 打印进度条 - 旧版兼容 */
.print-progress {
  width: 100%;
  padding: 0 var(--ep-space-1);
}

.print-progress :deep(.el-progress-bar__outer) {
  background-color: var(--ep-fill-color);
}

/* 打印中状态展示 */
.printing-status {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.progress-text {
  font-size: 11px;
  font-weight: var(--ep-font-weight-semibold);
  color: var(--ep-color-primary);
  text-align: center;
}

.printing-status :deep(.el-progress) {
  width: 100%;
}

.printing-status :deep(.el-progress-bar__outer) {
  border-radius: 5px;
  background-color: var(--ep-fill-color);
}

.printing-status :deep(.el-progress-bar__inner) {
  border-radius: 5px;
}
</style>
