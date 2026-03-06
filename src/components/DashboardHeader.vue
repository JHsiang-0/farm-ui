<template>
  <div class="dashboard-header">
    <div class="header-left">
      <h2 class="dashboard-title">
        <el-icon :size="24"><office-building /></el-icon>
        3楼车间
      </h2>
      <div class="stats-bar">
        <el-tag type="success" effect="dark" size="small">
          <el-icon><circle-check /></el-icon>
          在线: {{ statusCounts.ONLINE }}
        </el-tag>
        <el-tag type="primary" effect="dark" size="small">
          <el-icon><printer /></el-icon>
          打印中: {{ statusCounts.PRINTING }}
        </el-tag>
        <el-tag type="info" effect="dark" size="small">
          <el-icon><timer /></el-icon>
          空闲: {{ statusCounts.IDLE }}
        </el-tag>
        <el-tag type="danger" effect="dark" size="small">
          <el-icon><circle-close /></el-icon>
          离线: {{ statusCounts.OFFLINE }}
        </el-tag>
        <el-tag type="warning" effect="dark" size="small">
          <el-icon><warning /></el-icon>
          故障: {{ statusCounts.ERROR }}
        </el-tag>
      </div>
    </div>
    <div class="header-right">
      <el-button type="primary" plain size="small" @click="$emit('refresh')">
        <el-icon><refresh /></el-icon>
        刷新状态
      </el-button>
    </div>
  </div>
</template>

<script setup>
import {
  OfficeBuilding,
  CircleCheck,
  Printer,
  Timer,
  CircleClose,
  Warning,
  Refresh
} from '@element-plus/icons-vue'

defineOptions({ name: 'DashboardHeader' })

defineProps({
  /** 状态计数对象 */
  statusCounts: {
    type: Object,
    required: true,
    default: () => ({
      ONLINE: 0,
      OFFLINE: 0,
      PRINTING: 0,
      ERROR: 0,
      IDLE: 0
    })
  }
})

defineEmits(['refresh'])
</script>

<style scoped>
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
