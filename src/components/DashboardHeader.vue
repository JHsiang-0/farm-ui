<template>
  <div v-cloak class="dashboard-header">
    <div class="header-left">
      <h2 class="dashboard-title">
        <el-icon :size="24"><office-building /></el-icon>
        {{ labels.title }}
      </h2>
      <div class="stats-bar">
        <!-- 打印中 -->
        <el-tag type="primary" effect="dark" size="small">
          <el-icon>
            <printer />
          </el-icon>
          {{ labels.printing }}: {{ statusCounts.PRINTING || 0 }}
        </el-tag>
        <!-- 待机 -->
        <el-tag type="info" effect="dark" size="small">
          <el-icon><circle-check /></el-icon>
          {{ labels.standby }}: {{ statusCounts.STANDBY || 0 }}
        </el-tag>
        <!-- 已完成 -->
        <el-tag type="success" effect="dark" size="small">
          <el-icon>
            <circle-check-filled />
          </el-icon>
          {{ labels.completed }}: {{ statusCounts.COMPLETED || 0 }}
        </el-tag>
        <!-- 已暂停 -->
        <el-tag type="warning" effect="dark" size="small">
          <el-icon>
            <video-pause />
          </el-icon>
          {{ labels.paused }}: {{ statusCounts.PAUSED || 0 }}
        </el-tag>
        <!-- 致命错误（设备故障 + 系统错误） -->
        <el-tag type="danger" effect="dark" size="small">
          <el-icon><circle-close /></el-icon>
          {{ labels.fatal }}: {{ fatalCount }}
        </el-tag>
        <!-- 打印中断 -->
        <el-tag type="warning" effect="plain" size="small">
          <el-icon>
            <warning />
          </el-icon>
          {{ labels.printError }}: {{ statusCounts.PRINT_ERROR || 0 }}
        </el-tag>
      </div>
    </div>
    <div class="header-right">
      <el-button type="primary" plain size="small" @click="$emit('refresh')">
        <el-icon>
          <refresh />
        </el-icon>
        {{ labels.refresh }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  OfficeBuilding,
  CircleCheck,
  CircleCheckFilled,
  Printer,
  VideoPause,
  CircleClose,
  Warning,
  Refresh
} from '@element-plus/icons-vue'
import { PRINTER_STATE } from '@/utils/constants'

defineOptions({ name: 'DashboardHeader' })

// ============================================
// Data - 中文标签配置
// ============================================

const labels = {
  title: '3D打印农场监控',
  printing: '打印中',
  standby: '待机',
  completed: '已完成',
  paused: '已暂停',
  fatal: '致命错误',
  printError: '打印中断',
  refresh: '刷新状态'
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
  }
})

defineEmits(['refresh'])

// ============================================
// Computed
// ============================================

/**
 * 致命错误总数（设备故障 + 系统错误）
 */
const fatalCount = computed(() => {
  return (props.statusCounts[PRINTER_STATE.FAULT] || 0) +
    (props.statusCounts[PRINTER_STATE.SYS_ERROR] || 0)
})
</script>

<style scoped>
/* ============================================
   v-cloak: 防止 Vue 未加载完成时显示内容
   ============================================ */
[v-cloak] {
  display: none !important;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--ep-space-4) var(--ep-space-5);
  background: var(--ep-color-white);
  border-radius: var(--ep-border-radius-medium);
  box-shadow: var(--ep-box-shadow-light);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--ep-space-6);
}

.dashboard-title {
  display: flex;
  align-items: center;
  gap: var(--ep-space-2);
  margin: 0;
  font-size: var(--ep-font-size-large);
  font-weight: var(--ep-font-weight-semibold);
  color: var(--ep-text-color-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

.stats-bar {
  display: flex;
  gap: var(--ep-space-2);
  flex-wrap: nowrap;
}

.stats-bar .el-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1;
}

.stats-bar .el-tag :deep(.el-icon) {
  display: inline-flex;
  vertical-align: middle;
  margin-right: 2px;
}

.stats-bar .el-tag :deep(span) {
  display: inline;
  vertical-align: middle;
}

@media (max-width: 1200px) {
  .dashboard-header {
    flex-direction: column;
    gap: var(--ep-space-3);
    align-items: flex-start;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ep-space-3);
  }

  .stats-bar {
    flex-wrap: wrap;
  }
}
</style>
