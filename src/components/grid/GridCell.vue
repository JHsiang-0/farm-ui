<template>
    <!-- 过道占位 -->
    <div v-if="cellType === 'aisle'" class="aisle-cell">
        <div class="aisle-indicator" />
    </div>

    <!-- 空槽位 -->
    <div v-else-if="cellType === 'empty'" class="empty-slot"
        :class="{ 'is-drag-over': isDragOver, 'is-edit-mode': isEditMode }" @click="handleClick">
        <div class="slot-label">{{ slotLabel }}</div>
        <div class="add-hint">
            <el-icon>
                <Plus />
            </el-icon>
            <span>点击绑定</span>
        </div>
    </div>

    <!-- 设备卡片 -->
    <div v-else class="printer-card" :class="{ 'is-dragging': isDragging, 'is-edit-mode': isEditMode }" draggable="true"
        @dragstart="handleDragStart" @dragend="handleDragEnd" @dragenter="handleDragEnter" @dragleave="handleDragLeave"
        @drop="handleDrop" @click="handleClick">
        <!-- 卡片头部：设备编号和状态 -->
        <div class="card-header">
            <div class="printer-id">{{ device.machineNumber }}</div>
            <div class="status-badge" :class="statusClass">
                {{ statusText }}
            </div>
        </div>

        <!-- 卡片主体：温度信息 -->
        <div class="card-body">
            <!-- 喷头温度 -->
            <div class="temp-row">
                <div class="temp-icon">
                    <IconNozzle />
                </div>
                <div class="temp-values">
                    <span class="temp-current">{{ nozzleTemp }}</span>
                    <span class="temp-divider">/</span>
                    <span class="temp-target">{{ nozzleTarget }}</span>
                    <span class="temp-unit">°C</span>
                </div>
            </div>

            <!-- 热床温度 -->
            <div class="temp-row">
                <div class="temp-icon">
                    <IconBed />
                </div>
                <div class="temp-values">
                    <span class="temp-current">{{ bedTemp }}</span>
                    <span class="temp-divider">/</span>
                    <span class="temp-target">{{ bedTarget }}</span>
                    <span class="temp-unit">°C</span>
                </div>
            </div>
        </div>

        <!-- 卡片底部：进度条和打印信息 -->
        <div class="card-footer">
            <div class="progress-section">
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }" />
                </div>
                <div class="progress-text">{{ progressPercent }}%</div>
            </div>
            <div v-if="isPrinting" class="print-info">
                <div class="filament-info">
                    <IconSpool class="filament-icon" />
                    <span class="filament-name">{{ filamentName }}</span>
                </div>
                <div class="time-remaining">{{ timeRemaining }}</div>
            </div>
            <div v-else class="print-info idle-info">
                <span>{{ idleText }}</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import IconNozzle from '../icons/IconNozzle.vue'
import IconBed from '../icons/IconBed.vue'
import IconSpool from '../icons/IconSpool.vue'

defineOptions({ name: 'GridCell' })

// ============================================
// Props
// ============================================

const props = defineProps({
    /** 单元格类型: 'aisle' | 'empty' | 'device' */
    cellType: {
        type: String,
        required: true
    },
    /** 设备对象（仅 device 类型时有值） */
    device: {
        type: Object,
        default: null
    },
    /** 实时状态数据（仅 device 类型时有值） */
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
    /** 槽位标签（如 'A-01'） */
    slotLabel: {
        type: String,
        default: ''
    },
    /** 是否正在拖拽中 */
    isDragging: {
        type: Boolean,
        default: false
    },
    /** 是否拖拽悬停 */
    isDragOver: {
        type: Boolean,
        default: false
    },
    /** 是否编辑模式 */
    isEditMode: {
        type: Boolean,
        default: false
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
    'click'
])

// ============================================
// Computed - 状态相关
// ============================================

/** 状态映射 */
const STATUS_MAP = {
    operational: { text: '就绪', class: 'status-ready' },
    printing: { text: '打印中', class: 'status-printing' },
    paused: { text: '暂停', class: 'status-paused' },
    error: { text: '错误', class: 'status-error' },
    offline: { text: '离线', class: 'status-offline' },
    unknown: { text: '未知', class: 'status-unknown' }
}

/** 当前状态 */
const status = computed(() => {
    if (!props.realTimeData) return 'unknown'
    return props.realTimeData.state || 'unknown'
})

/** 状态文本 */
const statusText = computed(() => STATUS_MAP[status.value]?.text || '未知')

/** 状态样式类 */
const statusClass = computed(() => STATUS_MAP[status.value]?.class || 'status-unknown')

/** 是否正在打印中 */
const isPrinting = computed(() => status.value === 'printing')

/** 空闲文本 */
const idleText = computed(() => {
    const map = {
        operational: '待机中',
        paused: '已暂停',
        error: '出错',
        offline: '离线',
        unknown: '未知状态'
    }
    return map[status.value] || '待机中'
})

// ============================================
// Computed - 温度相关
// ============================================

/** 喷头温度 */
const nozzleTemp = computed(() => {
    if (!props.realTimeData?.extruder?.temperature) return '--'
    return Math.round(props.realTimeData.extruder.temperature)
})

/** 喷头目标温度 */
const nozzleTarget = computed(() => {
    if (!props.realTimeData?.extruder?.target) return '--'
    return Math.round(props.realTimeData.extruder.target)
})

/** 热床温度 */
const bedTemp = computed(() => {
    if (!props.realTimeData?.heaterBed?.temperature) return '--'
    return Math.round(props.realTimeData.heaterBed.temperature)
})

/** 热床目标温度 */
const bedTarget = computed(() => {
    if (!props.realTimeData?.heaterBed?.target) return '--'
    return Math.round(props.realTimeData.heaterBed.target)
})

// ============================================
// Computed - 打印进度相关
// ============================================

/** 打印进度百分比 */
const progressPercent = computed(() => {
    if (!props.realTimeData?.progress) return 0
    return Math.round(props.realTimeData.progress * 100)
})

/** 耗材名称 */
const filamentName = computed(() => {
    if (!props.realTimeData?.filament) return '未知耗材'
    return props.realTimeData.filament
})

/** 剩余时间 */
const timeRemaining = computed(() => {
    if (!props.realTimeData?.timeRemaining) return '--:--'
    const minutes = Math.ceil(props.realTimeData.timeRemaining / 60)
    if (minutes < 60) {
        return `${minutes}分钟`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`
})

// ============================================
// Event Handlers
// ============================================

function handleDragStart() {
    emit('dragstart', props.device, props.rowIndex, props.colIndex)
}

function handleDragEnd() {
    emit('dragend')
}

function handleDragEnter() {
    emit('dragenter', props.rowIndex, props.colIndex)
}

function handleDragLeave() {
    emit('dragleave')
}

function handleDrop() {
    emit('drop', props.rowIndex, props.colIndex)
}

function handleClick() {
    emit('click', props.device, props.rowIndex, props.colIndex)
}
</script>

<style scoped>
/* ============================================
   过道单元格
   ============================================ */
.aisle-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ep-color-gray-3);
    border-radius: var(--ep-border-radius-base);
}

.aisle-indicator {
    width: 4px;
    height: 80%;
    background: repeating-linear-gradient(to bottom,
            var(--ep-color-gray-5) 0,
            var(--ep-color-gray-5) 4px,
            transparent 4px,
            transparent 8px);
    opacity: 0.4;
}

/* ============================================
   空槽位
   ============================================ */
.empty-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--ep-fill-color-lighter);
    border: 2px dashed var(--ep-border-color);
    border-radius: var(--ep-border-radius-base);
    cursor: pointer;
    transition: all 0.2s ease;
}

.empty-slot:hover {
    border-color: var(--ep-color-primary);
    background: var(--ep-color-primary-light-9);
}

.empty-slot.is-drag-over {
    border-color: var(--ep-color-success);
    background: var(--ep-color-success-light-9);
}

.empty-slot.is-edit-mode {
    border-style: solid;
    border-color: var(--ep-color-primary);
    background: var(--ep-color-primary-light-8);
}

.slot-label {
    font-size: var(--ep-font-size-small);
    color: var(--ep-text-color-secondary);
    margin-bottom: var(--ep-space-1);
}

.add-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ep-space-1);
    color: var(--ep-text-color-placeholder);
    font-size: var(--ep-font-size-extra-small);
}

.add-hint .el-icon {
    font-size: 20px;
}

.empty-slot:hover .add-hint {
    color: var(--ep-color-primary);
}

/* ============================================
   打印机卡片 - 原始 PrinterCard 样式
   ============================================ */
.printer-card {
    display: flex;
    flex-direction: column;
    background: var(--ep-bg-color);
    border: 1px solid var(--ep-border-color-lighter);
    border-radius: var(--ep-border-radius-base);
    padding: var(--ep-space-2);
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    position: relative;
    overflow: hidden;
}

.printer-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
}

.printer-card.is-dragging {
    opacity: 0.5;
    cursor: grabbing;
}

.printer-card.is-edit-mode {
    border: 2px dashed var(--ep-color-primary);
    cursor: grab;
}

.printer-card.is-edit-mode:hover {
    border-style: solid;
    background: var(--ep-color-primary-light-9);
}

/* 卡片头部 */
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--ep-space-2);
}

.printer-id {
    font-size: var(--ep-font-size-small);
    font-weight: var(--ep-font-weight-semibold);
    color: var(--ep-text-color-primary);
}

.status-badge {
    padding: 2px 8px;
    border-radius: var(--ep-border-radius-small);
    font-size: var(--ep-font-size-extra-small);
    font-weight: var(--ep-font-weight-medium);
}

.status-ready {
    background: var(--ep-color-success-light-8);
    color: var(--ep-color-success);
}

.status-printing {
    background: var(--ep-color-primary-light-8);
    color: var(--ep-color-primary);
}

.status-paused {
    background: var(--ep-color-warning-light-8);
    color: var(--ep-color-warning);
}

.status-error {
    background: var(--ep-color-danger-light-8);
    color: var(--ep-color-danger);
}

.status-offline {
    background: var(--ep-color-gray-3);
    color: var(--ep-text-color-placeholder);
}

.status-unknown {
    background: var(--ep-color-gray-2);
    color: var(--ep-text-color-secondary);
}

/* 卡片主体 */
.card-body {
    display: flex;
    flex-direction: column;
    gap: var(--ep-space-1);
    margin-bottom: var(--ep-space-2);
}

.temp-row {
    display: flex;
    align-items: center;
    gap: var(--ep-space-2);
}

.temp-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ep-text-color-secondary);
}

.temp-icon svg {
    width: 16px;
    height: 16px;
}

.temp-values {
    display: flex;
    align-items: baseline;
    gap: 2px;
}

.temp-current {
    font-size: var(--ep-font-size-medium);
    font-weight: var(--ep-font-weight-semibold);
    color: var(--ep-text-color-primary);
}

.temp-divider {
    font-size: var(--ep-font-size-small);
    color: var(--ep-text-color-secondary);
}

.temp-target {
    font-size: var(--ep-font-size-small);
    color: var(--ep-text-color-secondary);
}

.temp-unit {
    font-size: var(--ep-font-size-extra-small);
    color: var(--ep-text-color-placeholder);
    margin-left: 2px;
}

/* 卡片底部 */
.card-footer {
    margin-top: auto;
    padding-top: var(--ep-space-2);
    border-top: 1px solid var(--ep-border-color-lighter);
}

.progress-section {
    display: flex;
    align-items: center;
    gap: var(--ep-space-2);
    margin-bottom: var(--ep-space-1);
}

.progress-bar-bg {
    flex: 1;
    height: 6px;
    background: var(--ep-fill-color);
    border-radius: 3px;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--ep-color-primary), var(--ep-color-primary-light-3));
    border-radius: 3px;
    transition: width 0.3s ease;
}

.progress-text {
    font-size: var(--ep-font-size-extra-small);
    font-weight: var(--ep-font-weight-medium);
    color: var(--ep-text-color-secondary);
    min-width: 32px;
    text-align: right;
}

.print-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--ep-font-size-extra-small);
}

.filament-info {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--ep-text-color-secondary);
}

.filament-icon {
    width: 14px;
    height: 14px;
}

.filament-name {
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.time-remaining {
    color: var(--ep-text-color-placeholder);
}

.idle-info {
    color: var(--ep-text-color-placeholder);
    justify-content: center;
}
</style>
