<template>
  <div v-cloak class="empty-slot" :class="{ 'drag-over': isDragOver }" :data-row="rowIndex" :data-col="colIndex"
    @click="$emit('click')" @dragover.prevent @dragenter.prevent="$emit('dragenter')" @dragleave="$emit('dragleleave')"
    @drop="$emit('drop')">
    <el-icon :size="20">
      <box />
    </el-icon>
    <span class="slot-text">{{ labels.emptySlot }}</span>
    <span class="slot-coord">{{ coordinateLabel }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Box } from '@element-plus/icons-vue'

defineOptions({ name: 'EmptySlot' })

// ============================================
// Data - 中文标签配置（数据驱动，避免硬编码）
// ============================================

const labels = {
  emptySlot: '暂无设备'
}

const props = defineProps({
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
  /** 是否处于拖拽悬停状态 */
  isDragOver: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click', 'dragenter', 'dragleave', 'drop'])

/** ASCII 码常量 */
const ASCII = {
  UPPER_A: 65 // 'A' 的 ASCII 码
}

/**
 * 网格配置常量
 * @constant {Object}
 */
const GRID_CONFIG = {
  AISLE_COL: 8, // 过道在第8列（视觉位置，1-based）
  AISLE_COL_INDEX: 7 // 过道列的数组索引（0-based）
}

/**
 * 根据网格列号获取物理列号（排除过道）
 * @param {number} gridCol - 网格列号（1-13）
 * @returns {number} 物理列号（1-12）
 */
function getPhysicalCol(gridCol) {
  if (gridCol < GRID_CONFIG.AISLE_COL) {
    return gridCol
  }
  return gridCol - 1
}

/**
 * 坐标标签显示
 */
const coordinateLabel = computed(() => {
  const rowLabel = String.fromCharCode(ASCII.UPPER_A + props.rowIndex)
  const physicalCol = getPhysicalCol(props.colIndex + 1)
  return `${rowLabel}-${physicalCol.toString().padStart(2, '0')}`
})
</script>

<style scoped>
/* ============================================
   v-cloak: 防止 Vue 未加载完成时显示内容
   ============================================ */
[v-cloak] {
  display: none !important;
}

.empty-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  border: 1px dashed var(--ep-border-color-base);
  border-radius: var(--ep-border-radius-base);
  background: transparent;
  gap: var(--ep-space-1);
  color: var(--ep-text-color-placeholder);
  transition: all var(--ep-transition-duration) var(--ep-transition-timing);
  cursor: pointer;
}

.empty-slot:hover {
  border-color: var(--ep-color-primary-light-1);
  background: var(--ep-color-primary-light-6);
}

.empty-slot.drag-over {
  border-color: var(--ep-color-primary);
  background: var(--ep-color-primary-light-5);
  transform: scale(1.02);
}

.empty-slot .el-icon {
  opacity: 0.5;
}

.slot-text {
  font-size: var(--ep-font-size-extra-small);
  color: var(--ep-text-color-placeholder);
}

.slot-coord {
  font-size: 10px;
  color: var(--ep-text-color-placeholder);
  font-family: 'Courier New', monospace;
}
</style>
