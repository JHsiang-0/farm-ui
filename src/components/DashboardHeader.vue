<template>
  <div v-cloak class="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm gap-4">
    <!-- 左侧：标题和车间信息 -->
    <div class="flex items-center shrink-0">
      <div class="flex items-center gap-3">
        <el-icon :size="28" class="text-primary">
          <office-building />
        </el-icon>
        <div class="flex flex-col gap-0.5">
          <h2 class="text-lg font-bold text-gray-900 leading-tight">{{ labels.title }}</h2>
          <span class="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
            <el-icon :size="12" class="text-red-500">
              <location />
            </el-icon>
            {{ workshopName }}
          </span>
        </div>
      </div>
    </div>

    <!-- 中间：状态统计条 -->
    <div class="flex flex-col items-center gap-2 flex-1 max-w-[800px]">
      <div class="flex items-center gap-1 flex-nowrap justify-center">
        <!-- 设备总数 -->
        <div class="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 transition-all cursor-default select-none shrink-0 hover:-translate-y-0.5">
          <div class="flex items-center justify-center w-5 h-5 rounded-full text-white bg-gray-600">
            <el-icon :size="12" />
          </div>
          <div class="flex items-center gap-1">
            <span class="text-xs text-gray-500 font-medium">{{ labels.total }}</span>
            <span class="text-sm font-bold text-gray-900 text-center min-w-4">{{ totalCount }}</span>
          </div>
        </div>

        <div class="w-px h-5 bg-gray-100 mx-1 shrink-0"></div>

        <!-- 打印中 -->
        <div class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-50 to-blue-100 transition-all cursor-default select-none shrink-0 hover:-translate-y-0.5"
          :class="{ 'ring-1 ring-blue-300': statusCounts.PRINTING > 0 }">
          <div class="flex items-center justify-center w-5 h-5 rounded-full text-white bg-blue-600">
            <IconNozzle class="w-3.5 h-3.5" />
          </div>
          <div class="flex items-center gap-1">
            <span class="text-xs text-gray-500 font-medium">{{ labels.printing }}</span>
            <span class="text-sm font-bold text-gray-900 text-center min-w-4">{{ statusCounts.PRINTING || 0 }}</span>
          </div>
        </div>

        <!-- 待机 -->
        <div class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-50 to-blue-100 transition-all cursor-default select-none shrink-0 hover:-translate-y-0.5">
          <div class="flex items-center justify-center w-5 h-5 rounded-full text-white bg-blue-500">
            <el-icon :size="12"><circle-check /></el-icon>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-xs text-gray-500 font-medium">{{ labels.standby }}</span>
            <span class="text-sm font-bold text-gray-900 text-center min-w-4">{{ statusCounts.STANDBY || 0 }}</span>
          </div>
        </div>

        <!-- 已完成 -->
        <div class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-green-50 to-green-100 transition-all cursor-default select-none shrink-0 hover:-translate-y-0.5">
          <div class="flex items-center justify-center w-5 h-5 rounded-full text-white bg-green-600">
            <el-icon :size="12"><circle-check-filled /></el-icon>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-xs text-gray-500 font-medium">{{ labels.completed }}</span>
            <span class="text-sm font-bold text-gray-900 text-center min-w-4">{{ statusCounts.COMPLETED || 0 }}</span>
          </div>
        </div>

        <!-- 已暂停 -->
        <div class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-50 to-yellow-100 transition-all cursor-default select-none shrink-0 hover:-translate-y-0.5"
          :class="{ 'ring-1 ring-yellow-300': statusCounts.PAUSED > 0 }">
          <div class="flex items-center justify-center w-5 h-5 rounded-full text-white bg-yellow-600">
            <el-icon :size="12"><video-pause /></el-icon>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-xs text-gray-500 font-medium">{{ labels.paused }}</span>
            <span class="text-sm font-bold text-gray-900 text-center min-w-4">{{ statusCounts.PAUSED || 0 }}</span>
          </div>
        </div>

        <!-- 致命错误 -->
        <div class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-red-50 to-red-100 transition-all cursor-default select-none shrink-0 hover:-translate-y-0.5"
          :class="{ 'ring-1 ring-red-300': fatalCount > 0 }">
          <div class="flex items-center justify-center w-5 h-5 rounded-full text-white bg-red-600">
            <el-icon :size="12"><circle-close /></el-icon>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-xs text-gray-500 font-medium">{{ labels.fatal }}</span>
            <span class="text-sm font-bold text-gray-900 text-center min-w-4">{{ fatalCount }}</span>
          </div>
        </div>

        <!-- 打印中断 -->
        <div class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-50 to-orange-100 transition-all cursor-default select-none shrink-0 hover:-translate-y-0.5"
          :class="{ 'ring-1 ring-orange-300': statusCounts.PRINT_ERROR > 0 }">
          <div class="flex items-center justify-center w-5 h-5 rounded-full text-white bg-orange-600">
            <el-icon :size="12"><warning /></el-icon>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-xs text-gray-500 font-medium">{{ labels.printError }}</span>
            <span class="text-sm font-bold text-gray-900 text-center min-w-4">{{ statusCounts.PRINT_ERROR || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- 进度概览 -->
      <div class="flex items-center gap-3 w-full max-w-[400px]" v-if="totalCount > 0">
        <div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
          <div class="h-full bg-blue-600 transition-all" :style="{ width: printingPercent + '%' }"></div>
          <div class="h-full bg-green-600 transition-all" :style="{ width: completedPercent + '%' }"></div>
          <div class="h-full bg-blue-500 transition-all" :style="{ width: standbyPercent + '%' }"></div>
          <div class="h-full bg-red-600 transition-all" :style="{ width: errorPercent + '%' }"></div>
        </div>
        <span class="text-xs text-gray-500 font-medium whitespace-nowrap">{{ printingCount }} 台正在打印</span>
      </div>
    </div>

    <!-- 右侧：操作按钮 -->
    <div class="flex flex-col items-end gap-2 shrink-0">
      <div class="flex items-center gap-2">
        <!-- 外部传入的操作按钮（解锁/保存布局） -->
        <slot name="actions"></slot>

        <!-- 刷新按钮 -->
        <el-button type="default" class="h-9 px-4 flex items-center gap-1.5"
          :disabled="isRefreshing"
          @click="handleRefresh">
          <el-icon :class="{ 'animate-spin': isRefreshing }">
            <refresh />
          </el-icon>
          <span>{{ isRefreshing ? labels.refreshing : labels.refresh }}</span>
        </el-button>
      </div>

      <!-- 最后更新时间 -->
      <span class="inline-flex items-center gap-1 text-xs text-gray-400 font-normal" v-if="lastUpdateTime">
        <el-icon :size="12">
          <clock />
        </el-icon>
        {{ labels.updatedAt }} {{ lastUpdateTime }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  OfficeBuilding,
  Location,
  CircleCheck,
  CircleCheckFilled,
  VideoPause,
  CircleClose,
  Warning,
  Refresh,
  Clock,
  Monitor
} from '@element-plus/icons-vue'
import IconNozzle from './icons/IconNozzle.vue'
import { PRINTER_STATE } from '@/utils/constants'

defineOptions({ name: 'DashboardHeader' })

// ============================================
// Data - 中文标签配置
// ============================================

const labels = {
  title: '3D打印农场监控',
  total: '设备总数',
  printing: '打印中',
  standby: '待机',
  completed: '已完成',
  paused: '已暂停',
  fatal: '致命错误',
  printError: '打印中断',
  refresh: '刷新状态',
  refreshing: '更新中...',
  updatedAt: '更新于',
  unknown: '离线/未知'
}

// ============================================
// Props
// ============================================

const props = defineProps({
  /** 状态计数对象 - 10个标准状态（包含 UNKNOWN） */
  statusCounts: {
    type: Object,
    required: true,
    default: () => ({
      [PRINTER_STATE.UNKNOWN]: 0,
      [PRINTER_STATE.PRINTING]: 0,
      [PRINTER_STATE.STANDBY]: 0,
      [PRINTER_STATE.COMPLETED]: 0,
      [PRINTER_STATE.PAUSED]: 0,
      [PRINTER_STATE.FAULT]: 0,
      [PRINTER_STATE.SYS_ERROR]: 0,
      [PRINTER_STATE.PRINT_ERROR]: 0,
      [PRINTER_STATE.STARTING]: 0,
      [PRINTER_STATE.CANCELLED]: 0
    })
  },
  /** 车间名称 */
  workshopName: {
    type: String,
    default: '3F-一号车间'
  },
  /** 最后更新时间 */
  lastUpdateTime: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['refresh'])

// ============================================
// Reactive State
// ============================================

const isRefreshing = ref(false)

// ============================================
// Computed
// ============================================

/**
 * 设备总数
 */
const totalCount = computed(() => {
  return Object.values(props.statusCounts).reduce((sum, count) => sum + (count || 0), 0)
})

/**
 * 打印中数量
 */
const printingCount = computed(() => {
  return props.statusCounts[PRINTER_STATE.PRINTING] || 0
})

/**
 * 致命错误总数（设备故障 + 系统错误）
 */
const fatalCount = computed(() => {
  return (props.statusCounts[PRINTER_STATE.FAULT] || 0) +
    (props.statusCounts[PRINTER_STATE.SYS_ERROR] || 0)
})

/**
 * 各状态百分比
 */
const printingPercent = computed(() => {
  return totalCount.value > 0 ? Math.round((printingCount.value / totalCount.value) * 100) : 0
})

const completedPercent = computed(() => {
  const count = props.statusCounts[PRINTER_STATE.COMPLETED] || 0
  return totalCount.value > 0 ? Math.round((count / totalCount.value) * 100) : 0
})

const standbyPercent = computed(() => {
  const count = props.statusCounts[PRINTER_STATE.STANDBY] || 0
  return totalCount.value > 0 ? Math.round((count / totalCount.value) * 100) : 0
})

const errorPercent = computed(() => {
  const count = fatalCount.value + (props.statusCounts[PRINTER_STATE.PRINT_ERROR] || 0)
  return totalCount.value > 0 ? Math.round((count / totalCount.value) * 100) : 0
})

// ============================================
// Methods
// ============================================

/**
 * 处理刷新按钮点击
 */
function handleRefresh() {
  if (isRefreshing.value) return

  isRefreshing.value = true
  emit('refresh')

  // 1.5秒后恢复按钮状态
  setTimeout(() => {
    isRefreshing.value = false
  }, 1500)
}
</script>

<style scoped>
/* ============================================
   动画关键帧
   ============================================ */
@keyframes pulse-primary {
  0%,
  100% {
    box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.5);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(219, 234, 254, 0.5);
  }
}

@keyframes pulse-danger {
  0%,
  100% {
    box-shadow: 0 0 0 2px rgba(254, 202, 202, 0.5);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(254, 226, 226, 0.5);
  }
}

.animate-spin {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ============================================
   响应式适配
   ============================================ */
@media (max-width: 1400px) {
  .dashboard-header {
    flex-wrap: wrap;
  }

  .header-center {
    order: 3;
    width: 100%;
    max-width: none;
  }

  .stats-bar {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-left,
  .header-right {
    justify-content: center;
  }

  .header-center {
    order: 0;
  }

  .stats-bar {
    justify-content: center;
  }

  .stat-label {
    display: none;
  }

  .action-group {
    width: 100%;
    justify-content: center;
  }
}
</style>
