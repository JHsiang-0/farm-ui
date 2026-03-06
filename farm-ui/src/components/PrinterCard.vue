<template>
  <el-card
    class="device-card"
    :class="[`status-${normalizedStatus}`, { 'dragging': isDragging }]"
    shadow="hover"
    draggable="true"
    :data-device-id="device.id"
    :data-row="rowIndex"
    :data-col="colIndex"
    @dragstart="$emit('dragstart', device, rowIndex, colIndex)"
    @dragend="$emit('dragend')"
    @dragover.prevent
    @dragenter.prevent="$emit('dragenter', rowIndex, colIndex)"
    @dragleave="$emit('dragleleave')"
    @drop="$emit('drop', rowIndex, colIndex)"
  >
    <!-- 卡片头部：机器编号和状态 -->
    <div class="card-header">
      <span class="machine-number">{{ device.machineNumber || '-' }}</span>
      <div class="status-wrapper">
        <el-tag :type="statusType" size="small" effect="plain">
          {{ statusLabel }}
        </el-tag>
        <div class="status-dot" :class="normalizedStatus"></div>
      </div>
    </div>

    <!-- 卡片内容区 -->
    <div class="card-content">
      <div class="info-row">
        <el-icon :size="12"><connection /></el-icon>
        <span class="info-text" :title="device.ipAddress">{{ device.ipAddress || '-' }}</span>
      </div>
      <div class="info-row">
        <el-icon :size="12"><coin /></el-icon>
        <span class="info-text" :title="device.currentMaterial">{{ device.currentMaterial || '无耗材' }}</span>
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

    <!-- 底部操作区 -->
    <div class="card-actions">
      <el-button-group size="small">
        <el-button type="primary" plain @click="$emit('detail', device)">
          <el-icon><zoom-in /></el-icon>
        </el-button>
        <el-button
          v-if="canStart"
          type="success"
          plain
          @click="$emit('start', device)"
        >
          <el-icon><video-play /></el-icon>
        </el-button>
        <el-button
          v-if="canPause"
          type="warning"
          plain
          @click="$emit('pause', device)"
        >
          <el-icon><video-pause /></el-icon>
        </el-button>
        <!-- 移除设备按钮（带二次确认） -->
        <el-popconfirm
          title="确定要将此设备从当前物理位置移除吗？"
          confirm-button-text="确认"
          cancel-button-text="取消"
          confirm-button-type="danger"
          @confirm="$emit('remove', device)"
        >
          <template #reference>
            <el-button type="danger" plain>
              <el-icon><delete /></el-icon>
            </el-button>
          </template>
        </el-popconfirm>
      </el-button-group>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import {
  Connection,
  Coin,
  Tools,
  Document,
  VideoPlay,
  VideoPause,
  Delete,
  ZoomIn
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

defineEmits([
  'dragstart',
  'dragend',
  'dragenter',
  'dragleleave',
  'drop',
  'detail',
  'start',
  'pause',
  'remove'
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

// ============================================
// Computed Properties
// ============================================

/** 标准化状态值（小写） */
const normalizedStatus = computed(() => {
  return props.device.status?.toLowerCase() || 'offline'
})

/** 状态标签类型 */
const statusType = computed(() => {
  const typeMap = {
    ONLINE: 'success',
    OFFLINE: 'info',
    PRINTING: 'primary',
    ERROR: 'danger'
  }
  return typeMap[props.device.status] || 'info'
})

/** 状态显示标签 */
const statusLabel = computed(() => {
  return STATUS_MAP[props.device.status]?.label || props.device.status
})

/** 是否可以启动 */
const canStart = computed(() => {
  return props.device.status === 'ONLINE'
})

/** 是否可以暂停 */
const canPause = computed(() => {
  return props.device.status === 'PRINTING'
})
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

/* 状态样式 */
.device-card.status-online {
  border-top: 3px solid var(--ep-color-success);
}

.device-card.status-offline {
  border-top: 3px solid var(--ep-color-info);
  opacity: 0.8;
}

.device-card.status-printing {
  border-top: 3px solid var(--ep-color-primary);
}

.device-card.status-error {
  border-top: 3px solid var(--ep-color-danger);
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
  animation: pulse 2s infinite;
}

.status-dot.error {
  background-color: var(--ep-color-danger);
  box-shadow: 0 0 6px var(--ep-color-danger);
  animation: blink 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
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

/* 底部操作区 */
.card-actions {
  margin-top: auto;
  padding-top: var(--ep-space-2);
  border-top: 1px solid var(--ep-border-color-lighter);
}

.card-actions :deep(.el-button) {
  padding: 4px 8px;
}
</style>
