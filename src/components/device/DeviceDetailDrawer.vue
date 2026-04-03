<template>
    <el-drawer v-model="visible" :title="drawerTitle" size="480px" :destroy-on-close="true"
        class="printer-detail-drawer" @closed="handleClosed">
        <div v-if="device" class="p-4 flex flex-col gap-5">
            <!-- 实时状态概览卡片 -->
            <div class="p-4 rounded-lg bg-gray-100 border" :class="[
                currentStateClass === 'fault' || currentStateClass === 'sys_error' ? 'bg-red-50 border-red-300' : '',
                currentStateClass === 'print_error' || currentStateClass === 'starting' || currentStateClass === 'paused' ? 'bg-yellow-50 border-yellow-300' : '',
                currentStateClass === 'printing' ? 'bg-gray-100 border-gray-500' : '',
                currentStateClass === 'completed' ? 'bg-green-50 border-green-300' : ''
            ]">
                <div class="flex items-center justify-between gap-3">
                    <el-tag :type="currentStateConfig.type" size="large" effect="dark" class="text-sm font-semibold">
                        {{ currentStateConfig.label }}
                    </el-tag>
                    <span v-if="realTimeData?.progress !== undefined && isPrintingState"
                        class="text-2xl font-bold text-gray-700">
                        {{ realTimeData.progress }}%
                    </span>
                </div>
                <div v-if="realTimeData?.systemMessage && isErrorState"
                    class="mt-3 p-3 bg-red-50 border border-red-300 rounded text-xs text-red-700 leading-tight flex items-start gap-2">
                    <el-icon class="shrink-0 mt-0.5">
                        <Warning />
                    </el-icon>
                    <span class="line-clamp-3">{{ realTimeData.systemMessage }}</span>
                </div>
            </div>

            <!-- 温度监控 -->
            <div class="flex flex-col gap-3">
                <div class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <IconNozzle class="w-4 h-4 text-red-600" />
                    温度监控
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="p-3 bg-gray-100 rounded-lg flex flex-col gap-1">
                        <span class="flex items-center text-xs text-gray-600">
                            <IconNozzle class="w-3.5 h-3.5 mr-1 text-red-600" />
                            喷头温度
                        </span>
                        <span class="text-2xl font-bold text-gray-900" :class="{ 'text-red-600': nozzleTemp > 50 }">
                            {{ formatTemp(nozzleTemp) }}
                        </span>
                    </div>
                    <div class="p-3 bg-gray-100 rounded-lg flex flex-col gap-1">
                        <span class="flex items-center text-xs text-gray-600">
                            <IconBed class="w-3.5 h-3.5 mr-1 text-yellow-600" />
                            热床温度
                        </span>
                        <span class="text-2xl font-bold text-gray-900" :class="{ 'text-yellow-600': bedTemp > 40 }">
                            {{ formatTemp(bedTemp) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- ASSIGNED 状态：待安全确认的任务信息 -->
            <div v-if="isAssignedState" class="flex flex-col gap-3">
                <div class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <el-icon class="text-yellow-600">
                        <Lock />
                    </el-icon>
                    待打印任务
                </div>
                <div class="p-4 bg-yellow-50 border border-yellow-300 rounded-lg flex flex-col gap-3">
                    <div class="flex items-start gap-3">
                        <div class="shrink-0 mt-0.5">
                            <el-icon :size="24" class="text-yellow-600">
                                <Lock />
                            </el-icon>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-yellow-800 text-base">
                                {{ props.realTimeData?.currentJobFileName ||
                                    props.device?.currentJobFileName ||
                                    '任务 #' + (props.realTimeData?.currentJobId || props.device?.currentJobId) }}
                            </div>
                            <div class="text-xs text-yellow-700 mt-1">
                                任务已分配，请确认现场安全后启动打印
                            </div>
                        </div>
                    </div>

                    <!-- 任务详情 -->
                    <el-divider class="my-2" />
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div class="flex flex-col">
                            <span class="text-xs text-yellow-600">任务编号</span>
                            <span class="font-medium text-yellow-800">#{{ props.realTimeData?.currentJobId ||
                                props.device?.currentJobId || '-' }}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-xs text-yellow-600">文件名称</span>
                            <span class="font-medium text-yellow-800 truncate">{{ props.realTimeData?.currentJobFileName
                                || props.device?.currentJobFileName || '-' }}</span>
                        </div>
                    </div>

                    <!-- 操作按钮 -->
                    <div class="mt-2">
                        <el-button v-if="!isSafetyConfirmed" type="warning" size="large"
                            class="w-full h-12 text-base font-semibold" @click="handleConfirmSafe" :loading="isLoading">
                            <el-icon>
                                <Lock />
                            </el-icon>
                            确认现场安全
                        </el-button>
                        <div v-else class="flex gap-2">
                            <el-button type="primary" size="large" class="flex-1 h-12 text-base font-semibold"
                                @click="handleStartPrint('START_PRINT')" :loading="isLoading">
                                <el-icon>
                                    <VideoPlay />
                                </el-icon>
                                下发并开始打印
                            </el-button>
                            <el-button type="default" size="large" class="flex-1 h-12 text-base font-semibold"
                                @click="handleStartPrint('UPLOAD_ONLY')" :loading="isLoading">
                                <el-icon>
                                    <DocumentAdd />
                                </el-icon>
                                仅下发文件
                            </el-button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 打印任务信息 -->
            <div v-if="isPrintingOrRelated" class="flex flex-col gap-3">
                <div class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <el-icon class="text-gray-600">
                        <Printer />
                    </el-icon>
                    打印任务
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="p-3 bg-gray-100 rounded-lg flex flex-col gap-1">
                        <span class="text-xs text-gray-600">打印时长</span>
                        <span class="text-base font-medium text-gray-900">{{ formatDuration(realTimeData?.printDuration)
                            }}</span>
                    </div>
                    <div class="p-3 bg-gray-100 rounded-lg flex flex-col gap-1">
                        <span class="flex items-center text-xs text-gray-600">
                            <IconSpool class="w-3.5 h-3.5 mr-1 text-green-600" />
                            已用耗材
                        </span>
                        <span class="text-base font-medium text-gray-900">{{ formatFilament(realTimeData?.filamentUsed)
                            }}</span>
                    </div>
                    <div v-if="isPrintingState" class="p-3 bg-gray-100 rounded-lg flex flex-col gap-1 col-span-2">
                        <span class="text-xs text-gray-600">打印进度</span>
                        <el-progress :percentage="realTimeData?.progress || 0" :status="progressStatus"
                            :stroke-width="10" class="mt-2" />
                    </div>
                </div>
            </div>

            <!-- 设备信息 -->
            <div class="flex flex-col gap-3">
                <div class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <el-icon class="text-gray-600">
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
            <div class="flex flex-col gap-3">
                <div class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <el-icon class="text-gray-600">
                        <Monitor />
                    </el-icon>
                    远程控制 (Moonraker / Mainsail)
                </div>
                <div class="flex flex-col gap-3">
                    <el-button v-if="device.ipAddress" type="primary" size="large" tag="a" :href="mainsailUrl"
                        target="_blank" rel="noopener noreferrer" class="w-full justify-center h-11 text-sm">
                        <el-icon>
                            <Monitor />
                        </el-icon>
                        打开 Mainsail 界面
                    </el-button>

                    <div class="grid grid-cols-2 gap-2">
                        <el-button type="warning" :disabled="!canPause" @click="handleAction('pause')" class="h-10">
                            <el-icon>
                                <VideoPause />
                            </el-icon>
                            暂停打印
                        </el-button>
                        <el-button type="success" :disabled="!canResume" @click="handleAction('resume')" class="h-10">
                            <el-icon>
                                <VideoPlay />
                            </el-icon>
                            恢复打印
                        </el-button>
                        <el-button type="danger" :disabled="!canCancel" @click="handleAction('cancel')" class="h-10">
                            <el-icon>
                                <CircleClose />
                            </el-icon>
                            取消任务
                        </el-button>
                        <el-button type="info" @click="handleAction('reboot')" class="h-10">
                            <el-icon>
                                <Refresh />
                            </el-icon>
                            重启主机
                        </el-button>
                    </div>

                    <div v-if="isFatalError" class="mt-3">
                        <el-divider>
                            <el-tag type="danger" effect="dark">紧急操作</el-tag>
                        </el-divider>
                        <el-button type="danger" size="large" class="w-full h-12 text-base font-bold"
                            @click="handleEmergencyStop">
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
            <div class="flex justify-end p-3 border-t border-gray-200">
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
import { computed, ref, watch } from 'vue'
import {
    Delete,
    Printer,
    InfoFilled,
    Monitor,
    VideoPause,
    VideoPlay,
    CircleClose,
    Refresh,
    Warning,
    Lock,
    DocumentAdd
} from '@element-plus/icons-vue'
import IconNozzle from '../icons/IconNozzle.vue'
import IconBed from '../icons/IconBed.vue'
import IconSpool from '../icons/IconSpool.vue'
import { PRINTER_STATE, PRINTER_STATE_MAP, PROGRESS_STATUS_MAP } from '@/utils/constants'
import { formatTemp, formatDuration, formatFilament } from '@/utils/formatters'
import { confirmSafe } from '@/api/printer'
import { startJob } from '@/api/job'
import { ElMessage } from 'element-plus'

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
    set: (val) => {
        emit('update:modelValue', val)
    }
})

// 监听抽屉打开事件
watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        // 打开抽屉时根据后端返回的 isSafeToPrint 初始化安全确认状态
        isSafetyConfirmed.value = !!props.device?.isSafeToPrint
    }
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

/** 是否为已分配状态（等待安全确认） */
const isAssignedState = computed(() => {
    const state = props.realTimeData?.state
    const hasJob = props.realTimeData?.currentJobId || props.device?.currentJobId
    const isPrinting = state === PRINTER_STATE.PRINTING

    return state === 'ASSIGNED' || (hasJob && !isPrinting && state !== PRINTER_STATE.COMPLETED)
})

/** 是否已确认安全 */
const isSafetyConfirmed = ref(false)

/** 是否正在执行操作 */
const isLoading = ref(false)

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

/** 确认现场安全 */
async function handleConfirmSafe() {
    try {
        isLoading.value = true
        await confirmSafe(props.device.id)
        ElMessage.success('现场安全确认成功！')
        isSafetyConfirmed.value = true
    } catch {
        // 错误信息由拦截器处理
    } finally {
        isLoading.value = false
    }
}

/** 启动打印 */
async function handleStartPrint(action) {
    try {
        isLoading.value = true
        const jobId = props.realTimeData?.currentJobId || props.device?.currentJobId
        if (!jobId) {
            ElMessage.error('找不到任务ID')
            return
        }
        await startJob(jobId, action)
        const successMsg = action === 'START_PRINT' ? '下发并开始打印成功！' : '仅下发文件成功！'
        ElMessage.success(successMsg)
        // 关闭抽屉
        visible.value = false
    } catch {
        // 错误信息由拦截器处理
    } finally {
        isLoading.value = false
    }
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
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
}
</style>
