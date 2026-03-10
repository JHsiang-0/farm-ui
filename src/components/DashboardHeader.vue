<template>
  <div v-cloak class="dashboard-header">
    <!-- 左侧：标题和车间信息 -->
    <div class="header-left">
      <div class="title-section">
        <el-icon :size="28" class="title-icon"><office-building /></el-icon>
        <div class="title-content">
          <h2 class="dashboard-title">{{ labels.title }}</h2>
          <span class="workshop-info">
            <el-icon :size="12">
              <location />
            </el-icon>
            {{ workshopName }}
          </span>
        </div>
      </div>
    </div>

    <!-- 中间：状态统计条 -->
    <div class="header-center">
      <div class="stats-bar">
        <!-- 设备总数 -->
        <div class="stat-item total">
          <div class="stat-icon-wrapper">
            <el-icon>
              <monitor />
            </el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">{{ labels.total }}</span>
            <span class="stat-value">{{ totalCount }}</span>
          </div>
        </div>

        <div class="stat-divider"></div>

        <!-- 打印中 -->
        <div class="stat-item printing" :class="{ active: statusCounts.PRINTING > 0 }">
          <div class="stat-icon-wrapper">
            <IconNozzle class="stat-icon-svg" />
          </div>
          <div class="stat-content">
            <span class="stat-label">{{ labels.printing }}</span>
            <span class="stat-value">{{ statusCounts.PRINTING || 0 }}</span>
          </div>
        </div>

        <!-- 待机 -->
        <div class="stat-item standby">
          <div class="stat-icon-wrapper">
            <el-icon><circle-check /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">{{ labels.standby }}</span>
            <span class="stat-value">{{ statusCounts.STANDBY || 0 }}</span>
          </div>
        </div>

        <!-- 已完成 -->
        <div class="stat-item completed">
          <div class="stat-icon-wrapper">
            <el-icon><circle-check-filled /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">{{ labels.completed }}</span>
            <span class="stat-value">{{ statusCounts.COMPLETED || 0 }}</span>
          </div>
        </div>

        <!-- 已暂停 -->
        <div class="stat-item paused" :class="{ active: statusCounts.PAUSED > 0 }">
          <div class="stat-icon-wrapper">
            <el-icon><video-pause /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">{{ labels.paused }}</span>
            <span class="stat-value">{{ statusCounts.PAUSED || 0 }}</span>
          </div>
        </div>

        <!-- 致命错误 -->
        <div class="stat-item fatal" :class="{ active: fatalCount > 0 }">
          <div class="stat-icon-wrapper">
            <el-icon><circle-close /></el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">{{ labels.fatal }}</span>
            <span class="stat-value">{{ fatalCount }}</span>
          </div>
        </div>

        <!-- 打印中断 -->
        <div class="stat-item error" :class="{ active: statusCounts.PRINT_ERROR > 0 }">
          <div class="stat-icon-wrapper">
            <el-icon>
              <warning />
            </el-icon>
          </div>
          <div class="stat-content">
            <span class="stat-label">{{ labels.printError }}</span>
            <span class="stat-value">{{ statusCounts.PRINT_ERROR || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- 进度概览 -->
      <div class="progress-overview" v-if="totalCount > 0">
        <div class="progress-bar">
          <div class="progress-segment printing" :style="{ width: printingPercent + '%' }"></div>
          <div class="progress-segment completed" :style="{ width: completedPercent + '%' }"></div>
          <div class="progress-segment standby" :style="{ width: standbyPercent + '%' }"></div>
          <div class="progress-segment error" :style="{ width: errorPercent + '%' }"></div>
        </div>
        <span class="progress-text">{{ printingCount }} 台正在打印</span>
      </div>
    </div>

    <!-- 右侧：操作按钮 -->
    <div class="header-right">
      <div class="action-group">
        <!-- 外部传入的操作按钮（解锁/保存布局） -->
        <slot name="actions"></slot>

        <!-- 刷新按钮 -->
        <el-button class="action-btn refresh-btn" :class="{ refreshing: isRefreshing }" @click="handleRefresh"
          :disabled="isRefreshing">
          <el-icon :class="{ rotating: isRefreshing }">
            <refresh />
          </el-icon>
          <span>{{ isRefreshing ? labels.refreshing : labels.refresh }}</span>
        </el-button>
      </div>

      <!-- 最后更新时间 -->
      <span class="last-update" v-if="lastUpdateTime">
        <el-icon>
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
  updatedAt: '更新于'
}

// ============================================
// Props
// ============================================

const props = defineProps({
  /** 状态计数对象 - 9个标准状态 */
  statusCounts: {
    type: Object,
    required: true,
    default: () => ({
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
   v-cloak: 防止 Vue 未加载完成时显示内容
   ============================================ */
[v-cloak] {
  display: none !important;
}

/* ============================================
   Dashboard Header - 仪表盘头部
   ============================================ */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--ep-space-4) var(--ep-space-5);
  background: var(--ep-color-white);
  border-radius: 16px;
  box-shadow: 4px 4px 0px var(--ep-border-color-darker);
  flex-shrink: 0;
  gap: var(--ep-space-4);
}

/* ============================================
   Header Left - 左侧标题区
   ============================================ */
.header-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.title-section {
  display: flex;
  align-items: center;
  gap: var(--ep-space-3);
}

.title-icon {
  color: var(--ep-color-primary);
  background: linear-gradient(135deg, var(--ep-color-primary-light-5) 0%, var(--ep-color-primary-light-6) 100%);
  padding: 8px;
  border-radius: 12px;
}

.title-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dashboard-title {
  margin: 0;
  font-size: 18px;
  font-weight: var(--ep-font-weight-bold);
  color: var(--ep-text-color-primary);
  line-height: 1.2;
}

.workshop-info {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--ep-text-color-secondary);
  font-weight: var(--ep-font-weight-medium);
}

.workshop-info .el-icon {
  color: var(--ep-color-danger);
}

/* ============================================
   Header Center - 中间统计区
   ============================================ */
.header-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ep-space-2);
  flex: 1;
  max-width: 800px;
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  justify-content: center;
}

.stat-divider {
  width: 1px;
  height: 20px;
  background: var(--ep-border-color-light);
  margin: 0 4px;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--ep-fill-color-light);
  transition: all 0.2s ease;
  cursor: default;
  user-select: none;
  flex-shrink: 0;
}

.stat-item:hover {
  transform: translateY(-1px);
}

.stat-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 12px;
}

.stat-icon-wrapper .el-icon {
  font-size: 12px;
}

.stat-icon-svg {
  font-size: 14px;
  width: 14px;
  height: 14px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--ep-text-color-secondary);
  font-weight: var(--ep-font-weight-medium);
}

.stat-value {
  font-size: 14px;
  font-weight: var(--ep-font-weight-bold);
  color: var(--ep-text-color-primary);
  min-width: 16px;
  text-align: center;
}

/* 各状态颜色主题 */
.stat-item.total {
  background: linear-gradient(135deg, #f0f2f5 0%, #e4e7ed 100%);
}

.stat-item.total .stat-icon-wrapper {
  background: var(--ep-text-color-regular);
  color: white;
}

.stat-item.printing {
  background: linear-gradient(135deg, var(--ep-color-primary-light-6) 0%, var(--ep-color-primary-light-5) 100%);
}

.stat-item.printing .stat-icon-wrapper {
  background: var(--ep-color-primary);
  color: white;
}

.stat-item.printing.active {
  box-shadow: 0 0 0 2px var(--ep-color-primary-light-3);
  animation: pulse-primary 2s infinite;
}

.stat-item.standby {
  background: linear-gradient(135deg, #f4f4f5 0%, #e4e4e7 100%);
}

.stat-item.standby .stat-icon-wrapper {
  background: var(--ep-text-color-secondary);
  color: white;
}

.stat-item.completed {
  background: linear-gradient(135deg, var(--ep-color-success-light-5) 0%, var(--ep-color-success-light-4) 100%);
}

.stat-item.completed .stat-icon-wrapper {
  background: var(--ep-color-success);
  color: white;
}

.stat-item.paused {
  background: linear-gradient(135deg, var(--ep-color-warning-light-5) 0%, var(--ep-color-warning-light-4) 100%);
}

.stat-item.paused .stat-icon-wrapper {
  background: var(--ep-color-warning);
  color: white;
}

.stat-item.paused.active {
  box-shadow: 0 0 0 2px var(--ep-color-warning-light-3);
}

.stat-item.fatal {
  background: linear-gradient(135deg, var(--ep-color-danger-light-5) 0%, var(--ep-color-danger-light-4) 100%);
}

.stat-item.fatal .stat-icon-wrapper {
  background: var(--ep-color-danger);
  color: white;
}

.stat-item.fatal.active {
  box-shadow: 0 0 0 2px var(--ep-color-danger-light-3);
  animation: pulse-danger 2s infinite;
}

.stat-item.error {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.stat-item.error .stat-icon-wrapper {
  background: #f59e0b;
  color: white;
}

.stat-item.error.active {
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
}

@keyframes pulse-primary {

  0%,
  100% {
    box-shadow: 0 0 0 2px var(--ep-color-primary-light-3);
  }

  50% {
    box-shadow: 0 0 0 4px var(--ep-color-primary-light-5);
  }
}

@keyframes pulse-danger {

  0%,
  100% {
    box-shadow: 0 0 0 2px var(--ep-color-danger-light-3);
  }

  50% {
    box-shadow: 0 0 0 4px var(--ep-color-danger-light-5);
  }
}

/* 进度概览 */
.progress-overview {
  display: flex;
  align-items: center;
  gap: var(--ep-space-3);
  width: 100%;
  max-width: 400px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--ep-fill-color-dark);
  border-radius: 3px;
  display: flex;
  overflow: hidden;
}

.progress-segment {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-segment.printing {
  background: var(--ep-color-primary);
}

.progress-segment.completed {
  background: var(--ep-color-success);
}

.progress-segment.standby {
  background: var(--ep-text-color-secondary);
}

.progress-segment.error {
  background: var(--ep-color-danger);
}

.progress-text {
  font-size: 11px;
  color: var(--ep-text-color-secondary);
  white-space: nowrap;
  font-weight: var(--ep-font-weight-medium);
}

/* ============================================
   Header Right - 右侧操作区
   ============================================ */
.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--ep-space-2);
  flex-shrink: 0;
}

.action-group {
  display: flex;
  align-items: center;
  gap: var(--ep-space-2);
}

.action-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: var(--ep-font-weight-medium);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.action-btn:hover {
  transform: translateY(-1px);
}

.action-btn:active {
  transform: scale(0.95);
}

/* 刷新按钮样式 */
.refresh-btn {
  background: var(--ep-color-white);
  border: 2px solid var(--ep-text-color-primary);
  color: var(--ep-text-color-regular);
  box-shadow: 2px 2px 0px var(--ep-text-color-primary);
}

.refresh-btn:hover {
  border-color: var(--ep-color-primary);
  color: var(--ep-color-primary);
  background: var(--ep-color-primary-light-6);
  box-shadow: 2px 2px 0px var(--ep-color-primary);
}

.refresh-btn.refreshing {
  border-color: var(--ep-color-primary);
  color: var(--ep-color-primary);
  background: var(--ep-color-primary-light-6);
  box-shadow: 2px 2px 0px var(--ep-color-primary);
}

.refresh-btn .el-icon {
  font-size: 14px;
}

.refresh-btn .el-icon.rotating {
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

/* 最后更新时间 */
.last-update {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ep-text-color-placeholder);
  font-weight: var(--ep-font-weight-regular);
}

.last-update .el-icon {
  font-size: 12px;
}

/* ============================================
   Responsive Design
   ============================================ */
@media (max-width: 1400px) {
  .dashboard-header {
    flex-wrap: wrap;
    gap: var(--ep-space-3);
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
    padding: var(--ep-space-3);
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

  .stat-item {
    padding: 4px 8px;
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
