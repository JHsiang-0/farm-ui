<template>
    <el-drawer v-model="visible" :title="drawerTitle" size="480px" :destroy-on-close="true"
        class="printer-detail-drawer" @closed="handleClosed">
        <div v-if="device" class="device-detail-content">
            <!-- 实时状态概览卡片 -->
            <div class="status-overview-card" :class="`status-${currentStateClass}`">
                <div class="status-header">
                    <el-tag :type="currentStateConfig.type" size="large" effect="dark" class="status-tag">
                        {{ currentStateConfig.label }}
                    </el-tag>
                    <span v-if="realTimeData?.progress !== undefined && isPrintingState" class="progress-text">
                        {{ realTimeData.progress }}%
                    </span>
                </div>
                <div v-if="realTimeData?.systemMessage && isErrorState" class="error-message">
                    <el-icon>
                        <Warning />
                    </el-icon>
                    <span>{{ realTimeData.systemMessage }}</span>
                </div>
            </div>

            <!-- 温度监控 -->
            <div class="detail-section">
                <div class="section-title">
                    <IconNozzle class="section-icon icon-nozzle" />
                    温度监控
                </div>
                <div class="temp-grid">
                    <div class="temp-item">
                        <span class="temp-label">
                            <IconNozzle class="temp-icon icon-nozzle" />
                            喷头温度
                        </span>
                        <span class="temp-value" :class="{ 'temp-hot': nozzleTemp > 50 }">
                            {{ formatTemp(nozzleTemp) }}
                        </span>
                    </div>
                    <div class="temp-item">
                        <span class="temp-label">
                            <IconBed class="temp-icon icon-bed" />
                            热床温度
                        </span>
                        <span class="temp-value" :class="{ 'temp-hot': bedTemp > 40 }">
                            {{ formatTemp(bedTemp) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- 打印任务信息 -->
            <div v-if="isPrintingOrRelated" class="detail-section">
                <div class="section-title">
                    <el-icon>
                        <Printer />
                    </el-icon>
                    打印任务
                </div>
                <div class="task-info-grid">
                    <div class="task-item">
                        <span class="task-label">打印时长</span>
                        <span class="task-value">{{ formatDuration(realTimeData?.printDuration) }}</span>
                    </div>
                    <div class="task-item">
                        <span class="task-label">
                            <IconSpool class="task-icon icon-spool" />
                            已用耗材
                        </span>
                        <span class="task-value">{{ formatFilament(realTimeData?.filamentUsed) }}</span>
                    </div>
                    <div v-if="isPrintingState" class="task-item full-width">
                        <span class="task-label">打印进度</span>
                        <el-progress :percentage="realTimeData?.progress || 0" :status="progressStatus"
                            :stroke-width="10" class="task-progress" />
                    </div>
                </div>
            </div>

            <!-- 设备信息 -->
            <div class="detail-section">
                <div class="section-title">
                    <el-icon>
                        <InfoFilled />
                    </el-icon>
                    设备信息
                </div>
                <el-descriptions :column="2" size="small" border>
                    <el-descriptions-item label="机器编号" :span="2">
                        {{ device.machineNumber || '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="设备名称" :span="2">
                        {{ device.name || '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="IP 地址" :span="2">
                        {{ device.ipAddress || '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="固件类型">
                        {{ device.firmwareType || '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="喷头尺寸">
                        {{ device.nozzleSize ? device.nozzleSize + 'mm' : '-' }}
                    </el-descriptions-item>
                </el-descriptions>
            </div>

            <!-- Moonraker / Mainsail 快捷操作 -->
            <div class="detail-section">
                <div class="section-title">
                    <el-icon>
                        <Monitor />
                    </el-icon>
                    远程控制 (Moonraker / Mainsail)
                </div>
                <div class="quick-actions">
                    <el-button v-if="device.ipAddress" type="primary" size="large" class="action-btn mainsail-btn"
                        tag="a" :href="mainsailUrl" target="_blank" rel="noopener noreferrer">
                        <el-icon>
                            <Monitor />
                        </el-icon>
                        打开 Mainsail 界面
                    </el-button>

                    <div class="control-grid">
                        <el-button type="warning" :disabled="!canPause" @click="handleAction('pause')">
                            <el-icon>
                                <VideoPause />
                            </el-icon>
                            暂停打印
                        </el-button>
                        <el-button type="success" :disabled="!canResume" @click="handleAction('resume')">
                            <el-icon>
                                <VideoPlay />
                            </el-icon>
                            恢复打印
                        </el-button>
                        <el-button type="danger" :disabled="!canCancel" @click="handleAction('cancel')">
                            <el-icon>
                                <CircleClose />
                            </el-icon>
                            取消任务
                        </el-button>
                        <el-button type="info" @click="handleAction('reboot')">
                            <el-icon>
                                <Refresh />
                            </el-icon>
                            重启主机
                        </el-button>
                    </div>

                    <div v-if="isFatalError" class="emergency-actions">
                        <el-divider>
                            <el-tag type="danger" effect="dark">紧急操作</el-tag>
                        </el-divider>
                        <el-button type="danger" size="large" class="emergency-btn" @click="handleEmergencyStop">
                            <el-icon>
                                <Warning />
                            </el-icon>
                            紧急停机 (ESTOP)
                        </el-button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 抽屉底部操作区 -->
        <template #footer>
            <div class="drawer-footer">
                <el-popconfirm title="确定要将此设备从该物理位置下架吗？" confirm-button-text="确认下架" cancel-button-text="取消"
                    confirm-button-type="danger" @confirm="handleRemove">
                    <template #reference>
                        <el-button type="danger" plain>
                            <el-icon>
                                <Delete />
                            </el-icon>
                            从看板下架
                        </el-button>
                    </template>
                </el-popconfirm>
            </div>
        </template>
    </el-drawer>
</template>

<script setup>
import { computed } from 'vue'
import {
    Delete,
    Printer,
    InfoFilled,
    Monitor,
    VideoPause,
    VideoPlay,
    CircleClose,
    Refresh,
    Warning
} from '@element-plus/icons-vue'
import IconNozzle from '../icons/IconNozzle.vue'
import IconBed from '../icons/IconBed.vue'
import IconSpool from '../icons/IconSpool.vue'
import { PRINTER_STATE, PRINTER_STATE_MAP, PROGRESS_STATUS_MAP } from '@/utils/constants'
import { formatTemp, formatDuration, formatFilament } from '@/utils/formatters'

defineOptions({ name: 'DeviceDetailDrawer' })

// ============================================
// Props
// ============================================

const props = defineProps({
    /** 是否显示抽屉 */
    modelValue: {
        type: Boolean,
        default: false
    },
    /** 设备对象 */
    device: {
        type: Object,
        default: null
    },
    /** 实时状态数据 */
    realTimeData: {
        type: Object,
        default: null
    }
})

// ============================================
// Emits
// ============================================

const emit = defineEmits([
    'update:modelValue',
    'action',
    'emergency-stop',
    'remove',
    'closed'
])

// ============================================
// Computed
// ============================================

/** 可见性双向绑定 */
const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

/** 抽屉标题 */
const drawerTitle = computed(() => {
    if (!props.device) return '设备详细信息'
    return `${props.device.machineNumber || props.device.name} - 详细信息`
})

/** 当前状态 */
const currentState = computed(() => {
    return props.realTimeData?.state || PRINTER_STATE.STANDBY
})

/** 当前状态配置 */
const currentStateConfig = computed(() => {
    return PRINTER_STATE_MAP[currentState.value] || PRINTER_STATE_MAP[PRINTER_STATE.STANDBY]
})

/** 当前状态类名 */
const currentStateClass = computed(() => {
    return currentState.value.toLowerCase()
})

/** 是否为打印中状态 */
const isPrintingState = computed(() => {
    return currentState.value === PRINTER_STATE.PRINTING
})

/** 是否为打印中或相关状态 */
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

/** 是否为错误状态 */
const isErrorState = computed(() => {
    return currentState.value === PRINTER_STATE.FAULT ||
        currentState.value === PRINTER_STATE.SYS_ERROR ||
        currentState.value === PRINTER_STATE.PRINT_ERROR
})

/** 是否为致命错误 */
const isFatalError = computed(() => {
    return currentState.value === PRINTER_STATE.FAULT ||
        currentState.value === PRINTER_STATE.SYS_ERROR
})

/** 喷头温度 */
const nozzleTemp = computed(() => {
    return props.realTimeData?.toolTemperature || 0
})

/** 热床温度 */
const bedTemp = computed(() => {
    return props.realTimeData?.bedTemperature || 0
})

/** Mainsail 访问地址 */
const mainsailUrl = computed(() => {
    if (!props.device?.ipAddress) return '#'
    return `http://${props.device.ipAddress}`
})

/** 进度条状态 */
const progressStatus = computed(() => {
    return PROGRESS_STATUS_MAP[currentState.value] || ''
})

/** 是否可以暂停 */
const canPause = computed(() => {
    return currentState.value === PRINTER_STATE.PRINTING
})

/** 是否可以恢复 */
const canResume = computed(() => {
    return currentState.value === PRINTER_STATE.PAUSED
})

/** 是否可以取消 */
const canCancel = computed(() => {
    return [PRINTER_STATE.PRINTING, PRINTER_STATE.PAUSED, PRINTER_STATE.PRINT_ERROR].includes(currentState.value)
})

// ============================================
// Event Handlers
// ============================================

function handleAction(action) {
    emit('action', action, props.device)
}

function handleEmergencyStop() {
    emit('emergency-stop', props.device)
}

function handleRemove() {
    emit('remove', props.device)
}

function handleClosed() {
    emit('closed')
}
</script>

<style scoped>
/* 抽屉整体样式 */
:deep(.el-drawer__body) {
    padding: 0;
    overflow-y: auto;
}

:deep(.el-drawer__header) {
    margin-bottom: 0;
    padding: var(--ep-space-4);
    border-bottom: 1px solid var(--ep-border-color-lighter);
}

.device-detail-content {
    padding: var(--ep-space-4);
    display: flex;
    flex-direction: column;
    gap: var(--ep-space-5);
}

/* 状态概览卡片 */
.status-overview-card {
    padding: var(--ep-space-4);
    border-radius: var(--ep-border-radius-base);
    background: var(--ep-fill-color-light);
    border: 1px solid var(--ep-border-color);
}

.status-overview-card.status-fault,
.status-overview-card.status-sys_error {
    background: var(--ep-color-danger-light-9);
    border-color: var(--ep-color-danger);
}

.status-overview-card.status-print_error,
.status-overview-card.status-starting,
.status-overview-card.status-paused {
    background: var(--ep-color-warning-light-9);
    border-color: var(--ep-color-warning);
}

.status-overview-card.status-printing {
    background: var(--ep-color-primary-light-9);
    border-color: var(--ep-color-primary);
}

.status-overview-card.status-completed {
    background: var(--ep-color-success-light-9);
    border-color: var(--ep-color-success);
}

.status-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ep-space-3);
}

.status-tag {
    font-size: 14px;
    font-weight: 600;
}

.progress-text {
    font-size: 20px;
    font-weight: bold;
    color: var(--ep-color-primary);
}

.error-message {
    margin-top: var(--ep-space-3);
    padding: var(--ep-space-3);
    background: var(--ep-color-danger-light-9);
    border-radius: var(--ep-border-radius-small);
    display: flex;
    align-items: flex-start;
    gap: var(--ep-space-2);
    font-size: 13px;
    color: var(--ep-color-danger);
    white-space: pre-wrap;
    word-break: break-word;
}

.error-message .el-icon {
    flex-shrink: 0;
    margin-top: 2px;
}

/* 详情区块 */
.detail-section {
    display: flex;
    flex-direction: column;
    gap: var(--ep-space-3);
}

.section-title {
    display: flex;
    align-items: center;
    gap: var(--ep-space-2);
    font-size: 14px;
    font-weight: 600;
    color: var(--ep-text-color-primary);
}

.section-title .el-icon {
    color: var(--ep-color-primary);
}

.section-icon {
    font-size: 16px;
}

.temp-icon,
.task-icon {
    font-size: 14px;
    margin-right: 4px;
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

.temp-label,
.task-label {
    display: flex;
    align-items: center;
}

/* 温度网格 */
.temp-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--ep-space-3);
}

.temp-item {
    display: flex;
    flex-direction: column;
    gap: var(--ep-space-1);
    padding: var(--ep-space-3);
    background: var(--ep-fill-color-light);
    border-radius: var(--ep-border-radius-base);
}

.temp-label {
    font-size: 12px;
    color: var(--ep-text-color-secondary);
}

.temp-value {
    font-size: 24px;
    font-weight: bold;
    color: var(--ep-text-color-primary);
}

.temp-value.temp-hot {
    color: var(--ep-color-danger);
}

/* 任务信息网格 */
.task-info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--ep-space-3);
}

.task-item {
    display: flex;
    flex-direction: column;
    gap: var(--ep-space-1);
    padding: var(--ep-space-3);
    background: var(--ep-fill-color-light);
    border-radius: var(--ep-border-radius-base);
}

.task-item.full-width {
    grid-column: span 2;
}

.task-label {
    font-size: 12px;
    color: var(--ep-text-color-secondary);
}

.task-value {
    font-size: 16px;
    font-weight: 500;
    color: var(--ep-text-color-primary);
}

.task-progress {
    margin-top: var(--ep-space-2);
}

/* 快捷操作区域 */
.quick-actions {
    display: flex;
    flex-direction: column;
    gap: var(--ep-space-3);
}

.action-btn {
    width: 100%;
    justify-content: center;
}

.mainsail-btn {
    height: 44px;
    font-size: 14px;
}

.control-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--ep-space-2);
}

.control-grid .el-button {
    height: 40px;
}

.emergency-actions {
    margin-top: var(--ep-space-3);
}

.emergency-btn {
    width: 100%;
    height: 48px;
    font-size: 15px;
    font-weight: bold;
}

/* 底部操作区 */
.drawer-footer {
    display: flex;
    justify-content: flex-end;
    padding: var(--ep-space-3) var(--ep-space-4);
    border-top: 1px solid var(--ep-border-color-lighter);
}
</style>
