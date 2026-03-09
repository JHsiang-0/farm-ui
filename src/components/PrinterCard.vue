<template>
  <el-card v-cloak class="device-card" :class="[`status-${stateClass}`, { 'dragging': isDragging }]" shadow="hover"
    :draggable="isEditMode" :data-device-id="device.id" :data-row="rowIndex" :data-col="colIndex"
    @click="handleCardClick" @dragstart="handleDragStart" @dragend="$emit('dragend')" @dragover.prevent
    @dragenter.prevent="$emit('dragenter', rowIndex, colIndex)" @dragleave.prevent="$emit('dragleave')"
    @drop="$emit('drop', rowIndex, colIndex)">
    <!-- 卡片头部：机器编号 -->
    <div class="card-header">
      <span class="machine-number">{{ displayMachineNumber }}</span>
    </div>

    <!-- 卡片内容区 -->
    <div class="card-content">
      <!-- 致命错误状态：只显示错误提示，隐藏所有数据 -->
      <template v-if="isFatalError">
        <div class="fatal-error-message">
          <el-icon :size="24" color="var(--ep-color-danger)"><warning-filled /></el-icon>
          <span class="error-text">{{ stateConfig.label }}</span>
        </div>
      </template>
      <!-- 正常状态：显示温度等信息 -->
      <template v-else>
        <!-- 温度信息 -->
        <div class="info-row">
          <IconNozzle class="info-icon icon-nozzle" />
          <span class="info-text">{{ displayNozzleTemp }}</span>
        </div>
        <div class="info-row">
          <IconBed class="info-icon icon-bed" />
          <span class="info-text">{{ displayBedTemp }}</span>
        </div>

        <!-- 打印任务信息 -->
        <template v-if="isPrintingOrRelated">
          <div class="info-row">
            <el-icon :size="12">
              <timer />
            </el-icon>
            <span class="info-text">时长: {{ displayDuration }}</span>
          </div>
          <div class="info-row">
            <IconSpool class="info-icon icon-spool" />
            <span class="info-text">{{ displayFilamentUsed }}</span>
          </div>
        </template>

        <!-- 喷头尺寸 -->
        <div class="info-row">
          <el-icon :size="12">
            <tools />
          </el-icon>
          <span class="info-text">喷头: {{ displayNozzleSize }}</span>
        </div>
      </template>
    </div>

    <!-- 卡片底部：状态横条 -->
    <div class="card-footer">
      <!-- 非打印状态：显示状态横条 -->
      <template v-if="!isPrinting">
        <div class="status-bar" :class="`status-bg-${stateClass}`">
          <span class="status-text">{{ stateConfig.label }}</span>
        </div>
      </template>
      <!-- 打印中状态：显示实时进度横条 -->
      <template v-else>
        <div class="status-bar status-bg-printing">
          <span class="status-text">打印中 {{ displayProgress }}%</span>
        </div>
      </template>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import {
  Timer,
  Tools,
  WarningFilled
} from '@element-plus/icons-vue'
import IconNozzle from './icons/IconNozzle.vue'
import IconBed from './icons/IconBed.vue'
import IconSpool from './icons/IconSpool.vue'
import {
  PRINTER_STATE,
  PRINTER_STATE_MAP
} from '@/utils/constants'
import {
  formatTemperature,
  formatDuration,
  formatFilamentUsed
} from '@/utils/printerUtils'

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
  },
  /** 是否处于编辑模式 */
  isEditMode: {
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
// State & Config
// ============================================

/**
 * 获取打印机状态对象
 * 优先使用 WebSocket 实时数据，否则使用设备基础数据
 */
const printerState = computed(() => {
  return props.realTimeData || {
    state: PRINTER_STATE.STANDBY,
    progress: 0,
    toolTemperature: 0,
    bedTemperature: 0,
    printDuration: 0,
    filamentUsed: 0,
    systemMessage: ''
  }
})

/**
 * 当前状态值（大写）
 */
const currentState = computed(() => {
  return printerState.value.state || PRINTER_STATE.STANDBY
})

/**
 * 状态配置（标签、类型、级别）
 */
const stateConfig = computed(() => {
  return PRINTER_STATE_MAP[currentState.value] || PRINTER_STATE_MAP[PRINTER_STATE.STANDBY]
})

/**
 * 状态类名（小写，用于 CSS）
 */
const stateClass = computed(() => {
  return currentState.value.toLowerCase()
})

/**
 * 是否为打印中状态
 */
const isPrinting = computed(() => {
  return currentState.value === PRINTER_STATE.PRINTING
})

/**
 * 是否为致命错误状态（FAULT/SYS_ERROR）
 * 此时隐藏后端数据，只显示错误状态
 */
const isFatalError = computed(() => {
  return [PRINTER_STATE.FAULT, PRINTER_STATE.SYS_ERROR].includes(currentState.value)
})

/**
 * 是否为打印中或相关状态（显示额外信息）
 */
const isPrintingOrRelated = computed(() => {
  const relatedStates = [
    PRINTER_STATE.PRINTING,
    PRINTER_STATE.PAUSED,
    PRINTER_STATE.PRINT_ERROR,
    PRINTER_STATE.COMPLETED,
    PRINTER_STATE.CANCELLED
  ]
  return relatedStates.includes(currentState.value)
})

// ============================================
// Display Computed Properties
// ============================================

/** 机器编号显示 */
const displayMachineNumber = computed(() => {
  if (props.device.machineNumber) {
    return props.device.machineNumber
  }
  // 根据 gridRow 和 gridCol 动态生成
  const row = props.device.gridRow
  const col = props.device.gridCol
  if (row && col) {
    const rowLabel = String.fromCharCode(64 + row)
    return `${rowLabel}-${col.toString().padStart(2, '0')}`
  }
  return '-'
})

/** 喷头温度显示 */
const displayNozzleTemp = computed(() => {
  return formatTemperature(printerState.value.toolTemperature)
})

/** 热床温度显示 */
const displayBedTemp = computed(() => {
  return formatTemperature(printerState.value.bedTemperature)
})

/** 打印时长显示 */
const displayDuration = computed(() => {
  return formatDuration(printerState.value.printDuration)
})

/** 耗材使用量显示 */
const displayFilamentUsed = computed(() => {
  return formatFilamentUsed(printerState.value.filamentUsed)
})

/** 喷头尺寸显示 */
const displayNozzleSize = computed(() => {
  return props.device.nozzleSize ? props.device.nozzleSize + 'mm' : '-'
})

/** 显示进度 */
const displayProgress = computed(() => {
  const progress = printerState.value.progress
  if (progress === undefined || progress === null) {
    return 0
  }
  return Math.min(100, Math.max(0, Number(progress)))
})


// ============================================
// Event Handlers
// ============================================

/** 处理卡片点击事件 */
function handleCardClick() {
  emit('click', props.device)
}

/** 处理拖拽开始事件 - 仅在编辑模式下允许拖拽 */
function handleDragStart(event) {
  if (!props.isEditMode) {
    event.preventDefault()
    return
  }
  emit('dragstart', props.device, props.rowIndex, props.colIndex)
}
</script>

<style scoped>
/* ============================================
   v-cloak: 防止 Vue 未加载完成时显示内容
   ============================================ */
[v-cloak] {
  display: none !important;
}

/* ============================================
   Device Card - 设备卡片
   ============================================ */
.device-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  transition: all var(--ep-transition-duration) var(--ep-transition-timing);
  cursor: pointer;
  user-select: none;
  /* 默认背景色 - 白色 */
  background-color: #ffffff !important;
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

/* 编辑模式下的拖拽样式 */
.device-card[draggable="true"] {
  cursor: grab;
}

.device-card[draggable="true"]:hover {
  cursor: grab;
}

.device-card[draggable="true"]:active {
  cursor: grabbing;
}

/* 强制覆盖 Element Plus 卡片默认样式 */
.device-card :deep(.el-card) {
  background-color: #ffffff !important;
  border: none;
  border-radius: 4px;
  overflow: hidden;
}

.device-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--ep-space-3);
  gap: var(--ep-space-2);
  background-color: #ffffff !important;
  border-radius: 4px;
}

/* ============================================
   9种状态卡片背景色 - 强制不透明
   ============================================ */

/* 🔴 致命级 - 淡红色背景 */
.device-card.status-fault,
.device-card.status-fault :deep(.el-card),
.device-card.status-fault :deep(.el-card__body) {
  background-color: #fee2e2 !important;
  border: 1px solid var(--ep-color-danger);
}

.device-card.status-sys_error,
.device-card.status-sys_error :deep(.el-card),
.device-card.status-sys_error :deep(.el-card__body) {
  background-color: #fee2e2 !important;
  border: 1px solid var(--ep-color-danger);
}

/* 🟡 警告级 - 淡黄色背景 */
.device-card.status-print_error,
.device-card.status-print_error :deep(.el-card),
.device-card.status-print_error :deep(.el-card__body) {
  background-color: #fef3c7 !important;
  border: 1px solid var(--ep-color-warning);
}

.device-card.status-starting,
.device-card.status-starting :deep(.el-card),
.device-card.status-starting :deep(.el-card__body) {
  background-color: #fef3c7 !important;
  border: 1px solid var(--ep-color-warning);
}

.device-card.status-paused,
.device-card.status-paused :deep(.el-card),
.device-card.status-paused :deep(.el-card__body) {
  background-color: #fef3c7 !important;
  border: 1px solid var(--ep-color-warning);
}

/* 🔵 正常业务级 */
/* 打印中 - 淡蓝色 */
.device-card.status-printing,
.device-card.status-printing :deep(.el-card),
.device-card.status-printing :deep(.el-card__body) {
  background-color: #dbeafe !important;
  border: 1px solid var(--ep-color-primary);
}

/* 已完成 - 淡绿色 */
.device-card.status-completed,
.device-card.status-completed :deep(.el-card),
.device-card.status-completed :deep(.el-card__body) {
  background-color: #d1fae5 !important;
  border: 1px solid var(--ep-color-success);
}

/* 待机 - 淡灰色 */
.device-card.status-standby,
.device-card.status-standby :deep(.el-card),
.device-card.status-standby :deep(.el-card__body) {
  background-color: #f3f4f6 !important;
  border: 1px solid var(--ep-color-gray-4);
}

/* 已取消 - 淡灰色 */
.device-card.status-cancelled,
.device-card.status-cancelled :deep(.el-card),
.device-card.status-cancelled :deep(.el-card__body) {
  background-color: #f3f4f6 !important;
  border: 1px solid var(--ep-color-gray-4);
}

/* ============================================
   卡片头部
   ============================================ */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
}

.machine-number {
  font-family: 'Courier New', monospace;
  font-size: var(--ep-font-size-small);
  font-weight: var(--ep-font-weight-bold);
  color: var(--ep-text-color-primary);
}

/* ============================================
   卡片内容区
   ============================================ */
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

.info-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.icon-nozzle {
  color: var(--ep-color-danger);
}

.icon-bed {
  color: var(--ep-color-warning);
}

.icon-spool {
  color: var(--ep-color-success);
}

.info-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 致命错误状态的消息显示 */
.fatal-error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  gap: 6px;
  padding: 8px 0;
  min-height: 0;
}

.fatal-error-message .error-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--ep-color-danger);
}

/* ============================================
   卡片底部 - 状态横条区域
   ============================================ */
.card-footer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  padding-top: var(--ep-space-2);
  margin-top: auto;
  border-top: 1px solid var(--ep-border-color-lighter);
  width: 100%;
}

/* 状态横条 - 与卡片等宽 */
.status-bar {
  width: 100%;
  padding: 6px 0;
  text-align: center;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-text {
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* ============================================
   9种状态横条背景色
   ============================================ */

/* 🔴 致命级 (Danger) */
.status-bar.status-bg-fault,
.status-bar.status-bg-sys_error {
  background-color: var(--ep-color-danger);
}

/* 🟡 警告级 (Warning) */
.status-bar.status-bg-print_error,
.status-bar.status-bg-starting,
.status-bar.status-bg-paused {
  background-color: var(--ep-color-warning);
}

/* 🔵 正常业务级 */
/* 打印中 - 蓝色 */
.status-bar.status-bg-printing {
  background-color: var(--ep-color-primary);
}

/* 已完成 - 绿色 */
.status-bar.status-bg-completed {
  background-color: var(--ep-color-success);
}

/* 待机 - 灰色 */
.status-bar.status-bg-standby {
  background-color: var(--ep-color-info);
}

/* 已取消 - 灰色 */
.status-bar.status-bg-cancelled {
  background-color: var(--ep-color-info);
}
</style>
