<template>
    <div class="grid-map" :class="{ 'is-edit-mode': isEditMode }">
        <!-- 行标签 -->
        <div class="row-labels">
            <div v-for="row in gridConfig.ROWS" :key="`label-${row}`" class="row-label">
                {{ formatRowLabel(row) }}{{ rowSuffix }}
            </div>
        </div>

        <!-- 网格主体 -->
        <div class="grid-container">
            <!-- 列标题 -->
            <div class="col-headers">
                <div v-for="col in gridConfig.TOTAL_COLS" :key="`header-${col}`" class="col-header"
                    :class="{ 'aisle-header': col === gridConfig.AISLE_COL }">
                    <template v-if="col === gridConfig.AISLE_COL">{{ aisleLabel }}</template>
                    <template v-else>{{ getPhysicalCol(col) }}</template>
                </div>
            </div>

            <!-- 设备网格 - 4行 x 13列 -->
            <div class="device-matrix">
                <template v-for="(row, rowIndex) in deviceMatrix" :key="`row-${rowIndex}`">
                    <GridCell v-for="(cell, colIndex) in row" :key="`cell-${rowIndex}-${colIndex}`"
                        :cell-type="getCellType(cell, colIndex)" :device="getDevice(cell)"
                        :real-time-data="getRealTimeData(cell)" :row-index="rowIndex" :col-index="colIndex"
                        :slot-label="getSlotLabel(rowIndex, colIndex)" :is-dragging="isDragging(cell)"
                        :is-drag-over="isDragOver(rowIndex, colIndex)" :is-edit-mode="isEditMode"
                        @dragstart="handleDragStart" @dragend="handleDragEnd" @dragenter="handleDragEnter"
                        @dragleave="handleDragLeave" @drop="handleDrop" @click="handleCellClick" />
                </template>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import GridCell from './GridCell.vue'
import { formatRowLabel } from '@/utils/formatters'

defineOptions({ name: 'GridMap' })

// ============================================
// Props
// ============================================

const props = defineProps({
    /** 设备矩阵数据 */
    deviceMatrix: {
        type: Array,
        required: true
    },
    /** 实时状态数据 Map */
    realTimeStatus: {
        type: Object,
        default: () => ({})
    },
    /** 网格配置 */
    gridConfig: {
        type: Object,
        required: true
    },
    /** 是否编辑模式 */
    isEditMode: {
        type: Boolean,
        default: false
    },
    /** 行标签后缀 */
    rowSuffix: {
        type: String,
        default: '排'
    },
    /** 过道标签 */
    aisleLabel: {
        type: String,
        default: '过道'
    },
    /** 正在拖拽的设备 */
    draggedDevice: {
        type: Object,
        default: null
    },
    /** 拖拽悬停位置 */
    dragOverCell: {
        type: Object,
        default: null
    }
})

// ============================================
// Emits
// ============================================

const emit = defineEmits([
    'dragstart',
    'dragend',
    'dragenter',
    'dragleave',
    'drop',
    'cell-click'
])

// ============================================
// Computed
// ============================================

/** 过道列索引（0-based） */
const aisleColIndex = computed(() => props.gridConfig.AISLE_COL - 1)

// ============================================
// Methods
// ============================================

/**
 * 获取单元格类型
 */
function getCellType(cell, colIndex) {
    if (colIndex === aisleColIndex.value) return 'aisle'
    if (cell === null) return 'empty'
    return 'device'
}

/**
 * 获取设备对象
 */
function getDevice(cell) {
    return typeof cell === 'object' && cell !== null ? cell : null
}

/**
 * 获取实时状态数据
 */
function getRealTimeData(cell) {
    const device = getDevice(cell)
    if (!device) return null
    return props.realTimeStatus[String(device.id)]
}

/**
 * 获取槽位标签
 */
function getSlotLabel(rowIndex, colIndex) {
    if (colIndex === aisleColIndex.value) return ''
    const row = rowIndex + 1
    const col = getPhysicalCol(colIndex + 1)
    return formatRowLabel(row) + '-' + col.toString().padStart(2, '0')
}

/**
 * 根据网格列号获取物理列号（排除过道）
 */
function getPhysicalCol(gridCol) {
    if (gridCol < props.gridConfig.AISLE_COL) {
        return gridCol
    }
    return gridCol - 1
}

/**
 * 判断设备是否正在拖拽中
 */
function isDragging(cell) {
    if (!props.draggedDevice || typeof cell !== 'object' || cell === null) return false
    return cell.id === props.draggedDevice.id
}

/**
 * 判断指定单元格是否处于拖拽悬停状态
 */
function isDragOver(rowIndex, colIndex) {
    if (!props.dragOverCell) return false
    return props.dragOverCell.row === rowIndex && props.dragOverCell.col === colIndex
}

// ============================================
// Event Handlers
// ============================================

function handleDragStart(device, rowIndex, colIndex) {
    emit('dragstart', device, rowIndex, colIndex)
}

function handleDragEnd() {
    emit('dragend')
}

function handleDragEnter(rowIndex, colIndex) {
    emit('dragenter', rowIndex, colIndex)
}

function handleDragLeave() {
    emit('dragleave')
}

function handleDrop(rowIndex, colIndex) {
    emit('drop', rowIndex, colIndex)
}

function handleCellClick(device, rowIndex, colIndex) {
    emit('cell-click', device, rowIndex, colIndex)
}
</script>

<style scoped>
.grid-map {
    display: flex;
    flex: 0 0 auto;
    gap: var(--ep-space-2);
    min-width: auto;
}

/* 行标签 - 固定尺寸 */
.row-labels {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: var(--ep-space-3);
    padding-top: 34px;
    /* 列标题高度 + margin */
    height: auto;
    flex: 0 0 auto;
}

.row-label {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 120px;
    background: #faf8f3;
    border: 2px dashed #d4c9b0;
    border-radius: var(--ep-border-radius-base);
    font-size: var(--ep-font-size-small);
    font-weight: var(--ep-font-weight-medium);
    color: #8b7355;
    writing-mode: vertical-rl;
    text-orientation: mixed;
}

/* 编辑模式高亮 */
.is-edit-mode .row-label {
    background: #f5f0e1;
    border-color: #c4b8a0;
    color: var(--ep-color-primary);
    font-weight: var(--ep-font-weight-bold);
}

/* 网格容器 - 固定尺寸 */
.grid-container {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    overflow: visible;
}

/* 列标题 - 固定宽度 */
.col-headers {
    display: grid;
    grid-template-columns: repeat(13, 100px);
    gap: var(--ep-space-3);
    margin-bottom: var(--ep-space-2);
}

.col-header {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    background: #faf8f3;
    border: 2px dashed #d4c9b0;
    border-radius: var(--ep-border-radius-small);
    font-size: var(--ep-font-size-extra-small);
    font-weight: var(--ep-font-weight-medium);
    color: #8b7355;
}

.col-header.aisle-header {
    background: #f0e8d8;
    color: #8b7355;
    font-weight: var(--ep-font-weight-semibold);
    border: 1px dashed #d4c9b0;
}

/* 编辑模式高亮 */
.is-edit-mode .col-header {
    background: #f5f0e1;
    border-color: #c4b8a0;
    color: var(--ep-color-primary);
    font-weight: var(--ep-font-weight-bold);
}

.is-edit-mode .col-header.aisle-header {
    background: #e8e0d0;
    color: #7a6545;
}

/* 设备矩阵 - 固定高度防止滚动 */
.device-matrix {
    display: grid;
    grid-template-columns: repeat(13, 100px);
    grid-template-rows: repeat(4, 120px);
    gap: var(--ep-space-3);
    flex: 0 0 auto;
}

/* 编辑模式网格背景 */
.is-edit-mode .device-matrix {
    background-image:
        linear-gradient(to right, var(--ep-border-color-light) 1px, transparent 1px),
        linear-gradient(to bottom, var(--ep-border-color-light) 1px, transparent 1px);
    background-size: 20px 20px;
    background-position: center center;
    border-radius: var(--ep-border-radius-base);
    padding: var(--ep-space-3);
    background-color: var(--ep-fill-color-lighter);
}
</style>
