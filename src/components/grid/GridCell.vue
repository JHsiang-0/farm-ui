<template>
    <!-- 过道占位 -->
    <div v-if="cellType === 'aisle'" class="aisle-cell">
        <div class="aisle-indicator" />
    </div>

    <!-- 空槽位 -->
    <div v-else-if="cellType === 'empty'" class="empty-slot"
        :class="{ 'is-drag-over': isDragOver, 'is-edit-mode': isEditMode }" @click="handleClick">
        <div class="slot-label">{{ slotLabel }}</div>
        <div class="empty-hint">
            <span>空</span>
        </div>
        <div class="add-hint-edit">
            <el-icon>
                <Plus />
            </el-icon>
            <span>点击绑定</span>
        </div>
    </div>

    <!-- 设备卡片 - Neo-Brutalism 风格 -->
    <div v-else class="printer-card" :class="[statusClass, { 'is-dragging': isDragging, 'is-edit-mode': isEditMode }]"
        draggable="true" @dragstart="handleDragStart" @dragend="handleDragEnd" @dragenter="handleDragEnter"
        @dragleave="handleDragLeave" @drop="handleDrop" @click="handleClick">
        <!-- 卡片头部：设备编号 -->
        <div class="card-header">
            <div class="printer-id">{{ device.machineNumber }}</div>
        </div>

        <!-- 错误提示（扩展显示，隐藏温度） -->
        <div v-if="(hasSystemError || hasPrintError) && realTimeData?.systemMessage" class="error-section">
            <div class="error-alert" :title="realTimeData.systemMessage">
                <el-icon>
                    <WarningFilled />
                </el-icon>
                <span class="error-text">{{ truncateText(realTimeData.systemMessage, 80) }}</span>
            </div>
        </div>

        <!-- 卡片主体：温度信息（小字体）- 错误状态隐藏 -->
        <div v-else class="card-body">
            <!-- 喷头温度 -->
            <div class="temp-row">
                <div class="temp-icon">
                    <IconNozzle />
                </div>
                <div class="temp-values">
                    <span class="temp-current">{{ nozzleTemp }}</span>
                    <span class="temp-divider">/</span>
                    <span class="temp-target">{{ nozzleTarget }}</span>
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
                </div>
            </div>
        </div>

        <!-- 卡片底部：状态或进度 -->
        <div class="card-footer">
            <!-- 打印中显示大百分比 -->
            <div v-if="isPrinting" class="printing-percent">
                {{ progressPercent }}%
            </div>
            <!-- 其他状态显示状态文本 -->
            <div v-else class="status-text">
                {{ statusText }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { Plus, WarningFilled } from '@element-plus/icons-vue'
import IconNozzle from '../icons/IconNozzle.vue'
import IconBed from '../icons/IconBed.vue'
import { PRINTER_STATE, PRINTER_STATE_MAP } from '@/utils/constants'

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

/** 当前状态 - 严格使用 unifiedState 字段 */
const status = computed(() => {
    if (!props.realTimeData) return PRINTER_STATE.UNKNOWN
    return props.realTimeData.unifiedState || PRINTER_STATE.UNKNOWN
})

/** 状态文本 - 使用 PRINTER_STATE_MAP */
const statusText = computed(() => {
    return PRINTER_STATE_MAP[status.value]?.label || '未知'
})

/** 状态样式类 - 使用 PRINTER_STATE_MAP */
const statusClass = computed(() => {
    const state = status.value
    // 直接返回状态对应的样式类
    const stateClassMap = {
        [PRINTER_STATE.UNKNOWN]: 'status-unknown',
        [PRINTER_STATE.FAULT]: 'status-fault',
        [PRINTER_STATE.SYS_ERROR]: 'status-sys-error',
        [PRINTER_STATE.STARTING]: 'status-starting',
        [PRINTER_STATE.STANDBY]: 'status-standby',
        [PRINTER_STATE.PRINTING]: 'status-printing',
        [PRINTER_STATE.PAUSED]: 'status-paused',
        [PRINTER_STATE.COMPLETED]: 'status-completed',
        [PRINTER_STATE.PRINT_ERROR]: 'status-print-error',
        [PRINTER_STATE.CANCELLED]: 'status-cancelled'
    }
    return stateClassMap[state] || 'status-unknown'
})

/** 是否正在打印中 */
const isPrinting = computed(() => status.value === PRINTER_STATE.PRINTING)

/** 是否显示系统错误信息（硬件故障或系统错误） */
const hasSystemError = computed(() => {
    return status.value === PRINTER_STATE.FAULT || status.value === PRINTER_STATE.SYS_ERROR
})

/** 是否显示打印错误 */
const hasPrintError = computed(() => {
    return status.value === PRINTER_STATE.PRINT_ERROR
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

// ============================================
// Methods
// ============================================

/** 截断文本 */
function truncateText(text, maxLength) {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
}

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
   过道单元格 - 米黄色背景
   ============================================ */
.aisle-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f0e1;
    border-radius: var(--ep-border-radius-base);
    border: 2px dashed #d4c9b0;
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
   空槽位 - 米黄色虚线边框
   ============================================ */
.empty-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #faf8f3;
    border: 2px dashed #d4c9b0;
    border-radius: var(--ep-border-radius-base);
    cursor: default;
    transition: all 0.2s ease;
}

.empty-slot.is-edit-mode {
    cursor: pointer;
    background: #f5f0e1;
    border-color: #c4b8a0;
}

.empty-slot.is-edit-mode:hover {
    border-color: var(--ep-color-primary);
    background: var(--ep-color-primary-light-9);
}

.empty-slot.is-drag-over {
    border-color: var(--ep-color-success);
    background: var(--ep-color-success-light-9);
}

.empty-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #b8a890;
    font-size: 14px;
    font-weight: 500;
}

.empty-slot.is-edit-mode .empty-hint {
    display: none;
}

/* 编辑模式下显示添加提示 */
.empty-slot .add-hint-edit {
    display: none;
    flex-direction: column;
    align-items: center;
    gap: var(--ep-space-1);
    color: var(--ep-color-primary);
    font-size: var(--ep-font-size-extra-small);
}

.empty-slot.is-edit-mode .add-hint-edit {
    display: flex;
}

/* ============================================
   打印机卡片 - Neo-Brutalism 新粗野主义风格
   ============================================ */
.printer-card {
    display: flex;
    flex-direction: column;
    height: 120px;
    padding: 6px 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;
    overflow: hidden;
    /* 硬阴影边框效果 */
    border: 3px solid;
    border-radius: 8px;
    box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.25);
}

.printer-card:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.3);
}

.printer-card.is-dragging {
    opacity: 0.7;
    cursor: grabbing;
    box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.2);
}

.printer-card.is-edit-mode {
    border-style: dashed;
}

/* 9种状态颜色配置 - 背景色遮罩 + 深色边框 */
/* UNKNOWN - 灰色 */
.printer-card.status-unknown {
    background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
    border-color: #9ca3af;
}

/* FAULT - 深红色 */
.printer-card.status-fault {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    border-color: #dc2626;
}

/* SYS_ERROR - 橙红色 */
.printer-card.status-sys-error {
    background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
    border-color: #ea580c;
}

/* STARTING - 黄色 */
.printer-card.status-starting {
    background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%);
    border-color: #ca8a04;
}

/* STANDBY - 青色 */
.printer-card.status-standby {
    background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%);
    border-color: #0891b2;
}

/* PRINTING - 蓝色 */
.printer-card.status-printing {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    border-color: #2563eb;
}

/* PAUSED - 琥珀色 */
.printer-card.status-paused {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-color: #d97706;
}

/* COMPLETED - 绿色 */
.printer-card.status-completed {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    border-color: #16a34a;
}

/* PRINT_ERROR - 紫色 */
.printer-card.status-print-error {
    background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
    border-color: #9333ea;
}

/* CANCELLED - 灰色 */
.printer-card.status-cancelled {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    border-color: #6b7280;
}

/* 卡片头部 - 左对齐 */
.card-header {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin-bottom: 4px;
}

.printer-id {
    font-size: 14px;
    font-weight: 800;
    color: #1f2937;
    text-shadow: 1px 1px 0px rgba(255, 255, 255, 0.8);
}

/* 错误区域 - 扩展显示，与温度区域等高 */
.error-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-bottom: 2px;
    min-height: 32px;
    max-height: 32px;
}

.error-alert {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 6px 8px;
    background: rgba(220, 38, 38, 0.1);
    border: 2px solid #dc2626;
    border-radius: 6px;
    font-size: 11px;
    color: #7f1d1d;
    line-height: 1.3;
    flex: 1;
    overflow: hidden;
}

.error-alert .el-icon {
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 1px;
}

.error-text {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
}

/* 卡片主体 - 小字体温度 */
.card-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 2px;
    flex: 1;
    min-height: 32px;
}

.temp-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.temp-icon {
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(75, 85, 99, 0.6);
    flex-shrink: 0;
}

.temp-icon svg {
    width: 12px;
    height: 12px;
}

.temp-values {
    display: flex;
    align-items: baseline;
    gap: 2px;
    font-size: 11px;
    font-weight: 600;
    color: rgba(55, 65, 81, 0.7);
}

.temp-current {
    color: rgba(17, 24, 39, 0.75);
}

.temp-divider {
    color: rgba(156, 163, 175, 0.6);
}

.temp-target {
    color: rgba(107, 114, 128, 0.6);
    font-size: 10px;
}

/* 卡片底部 - 居中状态/百分比，固定在底部 */
.card-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 2px;
    border-top: 2px dashed rgba(0, 0, 0, 0.1);
    margin-top: auto;
    flex-shrink: 0;
    height: 22px;
}

/* 状态文本 - 居中显示 */
.status-text {
    font-size: 11px;
    font-weight: 700;
    color: #1f2937;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* 打印百分比 - 大字体居中 */
.printing-percent {
    font-size: 20px;
    font-weight: 800;
    color: #2563eb;
    text-shadow: 2px 2px 0px rgba(255, 255, 255, 0.8);
    line-height: 1;
}
</style>
