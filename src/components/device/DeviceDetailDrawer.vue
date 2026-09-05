<template>
    <!--
      设备详情抽屉 - 响应式优化版本
      - 移动端：全屏宽度，优化触摸体验
      - 平板：70% 宽度
      - 桌面：固定最大宽度，防止大屏过度拉伸
    -->
    <t-drawer :visible="modelValue" :header="drawerTitle"
        :size="drawerSize"
        :destroy-on-close="true"
        :show-in-attached-element="true"
        class="printer-detail-drawer"
        :class="{ 'is-mobile': isMobile, 'is-tablet': isTablet }"
        @update:visible="handleVisibleChange">

        <!-- 内容区域 - 使用流式内边距 -->
        <div v-if="device" class="p-fluid-md flex flex-col gap-fluid-lg">
            <!-- 实时状态概览卡片 -->
            <div class="p-fluid-md rounded-lg bg-gray-100 border" :class="[
                currentStateClass === 'fault' || currentStateClass === 'sys_error' ? 'bg-red-50 border-red-300' : '',
                currentStateClass === 'print_error' || currentStateClass === 'starting' || currentStateClass === 'paused' ? 'bg-yellow-50 border-yellow-300' : '',
                currentStateClass === 'printing' ? 'bg-gray-100 border-gray-500' : '',
                currentStateClass === 'completed' ? 'bg-green-50 border-green-300' : ''
            ]">
                <!-- 状态标签和进度 -->
                <div class="flex items-center justify-between gap-3">
                    <t-tag :theme="currentStateConfig.type" size="large" variant="dark" class="text-fluid-sm font-semibold">
                        {{ currentStateConfig.label }}
                    </t-tag>
                    <span v-if="realTimeData?.progress !== undefined && isPrintingState"
                        class="text-fluid-2xl font-bold text-gray-700">
                        {{ realTimeData.progress }}%
                    </span>
                </div>

                <!-- 系统错误信息 -->
                <div v-if="realTimeData?.systemMessage && isErrorState"
                    class="mt-3 p-fluid-sm bg-red-50 border border-red-300 rounded text-fluid-xs text-red-700 leading-tight flex items-start gap-2">
                    <span class="shrink-0 mt-0.5">
                        <Warning />
                    </span>
                    <span class="line-clamp-3">{{ realTimeData.systemMessage }}</span>
                </div>
            </div>

            <!-- 温度监控 -->
            <div class="flex flex-col gap-fluid-sm">
                <div class="flex items-center gap-2 text-fluid-sm font-semibold text-gray-900">
                    <IconNozzle class="w-4 h-4 text-red-600" />
                    温度监控
                </div>
                <!-- 温度卡片网格 - 响应式：移动端堆叠，桌面端并排 -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-fluid-sm">
                    <!-- 喷头温度 -->
                    <div class="p-fluid-sm bg-gray-100 rounded-lg flex flex-col gap-1">
                        <span class="flex items-center text-fluid-xs text-gray-600">
                            <IconNozzle class="w-3.5 h-3.5 mr-1 text-red-600" />
                            喷头温度
                        </span>
                        <span class="text-fluid-2xl font-bold text-gray-900" :class="{ 'text-red-600': nozzleTemp > 50 }">
                            {{ formatTemp(nozzleTemp) }}
                        </span>
                    </div>
                    <!-- 热床温度 -->
                    <div class="p-fluid-sm bg-gray-100 rounded-lg flex flex-col gap-1">
                        <span class="flex items-center text-fluid-xs text-gray-600">
                            <IconBed class="w-3.5 h-3.5 mr-1 text-yellow-600" />
                            热床温度
                        </span>
                        <span class="text-fluid-2xl font-bold text-gray-900" :class="{ 'text-yellow-600': bedTemp > 40 }">
                            {{ formatTemp(bedTemp) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- ASSIGNED 状态：待安全确认的任务信息 -->
            <div v-if="isAssignedState" class="flex flex-col gap-fluid-sm">
                <div class="flex items-center gap-2 text-fluid-sm font-semibold text-gray-900">
                    <span class="text-yellow-600">
                        <Lock />
                    </span>
                    待打印任务
                </div>
                <div class="p-fluid-md bg-yellow-50 border border-yellow-300 rounded-lg flex flex-col gap-fluid-sm">
                    <!-- 任务标题和图标 -->
                    <div class="flex items-start gap-3">
                        <div class="shrink-0 mt-0.5">
                            <Lock :size="24" class="text-yellow-600" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-yellow-800 text-fluid-lg">
                                {{ props.realTimeData?.currentJobFileName ||
                                    props.device?.currentJobFileName ||
                                    '任务 #' + (props.realTimeData?.currentJobId || props.device?.currentJobId) }}
                            </div>
                            <div class="text-fluid-xs text-yellow-700 mt-1">
                                任务已分配，请确认现场安全后启动打印
                            </div>
                        </div>
                    </div>

                    <!-- 任务详情网格 -->
                    <t-divider class="my-2" />
                    <div class="grid grid-cols-2 gap-2 text-fluid-sm">
                        <div class="flex flex-col">
                            <span class="text-fluid-xs text-yellow-600">任务编号</span>
                            <span class="font-medium text-yellow-800">#{{ props.realTimeData?.currentJobId ||
                                props.device?.currentJobId || '-' }}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-fluid-xs text-yellow-600">文件名称</span>
                            <span class="font-medium text-yellow-800 truncate">{{ props.realTimeData?.currentJobFileName
                                || props.device?.currentJobFileName || '-' }}</span>
                        </div>
                    </div>

                    <!-- 操作按钮 -->
                    <div class="mt-2">
                        <t-button v-if="!isSafetyConfirmed" theme="warning" size="large"
                            class="w-full" @click="handleConfirmSafe" :loading="isLoading">
                            <span>
                                <Lock />
                            </span>
                            确认现场安全
                        </t-button>
                        <div v-else class="flex gap-2">
                            <t-button theme="primary" size="large" class="flex-1"
                                @click="handleStartPrint('START_PRINT')" :loading="isLoading">
                                <span>
                                    <VideoPlay />
                                </span>
                                下发并开始打印
                            </t-button>
                            <t-button theme="default" size="large" class="flex-1"
                                @click="handleStartPrint('UPLOAD_ONLY')" :loading="isLoading">
                                <span>
                                    <DocumentAdd />
                                </span>
                                仅下发文件
                            </t-button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 打印任务信息 -->
            <div v-if="isPrintingOrRelated" class="flex flex-col gap-fluid-sm">
                <div class="flex items-center gap-2 text-fluid-sm font-semibold text-gray-900">
                    <span class="text-gray-600">
                        <Printer />
                    </span>
                    打印任务
                </div>
                <div class="grid grid-cols-2 gap-fluid-sm">
                    <div class="p-fluid-sm bg-gray-100 rounded-lg flex flex-col gap-1">
                        <span class="text-fluid-xs text-gray-600">打印时长</span>
                        <span class="text-fluid-base font-medium text-gray-900">{{ formatDuration(realTimeData?.printDuration)
                            }}</span>
                    </div>
                    <div class="p-fluid-sm bg-gray-100 rounded-lg flex flex-col gap-1">
                        <span class="flex items-center text-fluid-xs text-gray-600">
                            <IconSpool class="w-3.5 h-3.5 mr-1 text-green-600" />
                            已用耗材
                        </span>
                        <span class="text-fluid-base font-medium text-gray-900">{{ formatFilament(realTimeData?.filamentUsed)
                            }}</span>
                    </div>
                    <div v-if="isPrintingState" class="p-fluid-sm bg-gray-100 rounded-lg flex flex-col gap-1 col-span-2">
                        <span class="text-fluid-xs text-gray-600">打印进度</span>
                        <t-progress :percentage="realTimeData?.progress || 0" :status="progressStatus"
                            :stroke-width="10" class="mt-2" />
                    </div>
                </div>
            </div>

            <!-- 设备信息 -->
            <div class="flex flex-col gap-fluid-sm">
                <div class="flex items-center gap-2 text-fluid-sm font-semibold text-gray-900">
                    <span class="text-gray-600">
                        <InfoFilled />
                    </span>
                    设备信息
                </div>
                <t-descriptions :column="descriptionColumn" size="small" bordered>
                    <t-descriptions-item label="机器编号" :span="descriptionColumn">
                        {{ device.machineNumber || `#${device.id}` }}
                    </t-descriptions-item>
                    <t-descriptions-item label="设备名称" :span="descriptionColumn">
                        {{ device.name || '-' }}
                    </t-descriptions-item>
                    <t-descriptions-item label="IP 地址" :span="descriptionColumn">
                        {{ device.ipAddress || '-' }}
                    </t-descriptions-item>
                    <t-descriptions-item label="固件类型">
                        {{ device.firmwareType || '-' }}
                    </t-descriptions-item>
                    <t-descriptions-item label="喷头尺寸">
                        {{ device.nozzleSize ? device.nozzleSize + 'mm' : '-' }}
                    </t-descriptions-item>
                </t-descriptions>
            </div>

            <!-- Moonraker / Mainsail 快捷操作 -->
            <div class="flex flex-col gap-fluid-sm">
                <div class="flex items-center gap-2 text-fluid-sm font-semibold text-gray-900">
                    <span class="text-gray-600">
                        <Monitor />
                    </span>
                    远程控制
                </div>
                <div class="flex flex-col gap-fluid-sm">
                    <t-button v-if="device.ipAddress && device.firmwareType !== 'RRF'" theme="primary" size="large" tag="a" :href="mainsailUrl"
                        target="_blank" rel="noopener noreferrer" class="w-full justify-center h-11 text-fluid-sm">
                        <span>
                            <Monitor />
                        </span>
                        打开 Mainsail 界面
                    </t-button>

                    <!-- 操作按钮网格 - 移动端 2列，桌面 3列 -->
                    <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        <t-button theme="warning" :disabled="actionLoading || !canPause" :loading="actionLoading" @click="handleAction('pause')" class="h-10">
                            <span>
                                <VideoPause />
                            </span>
                            暂停
                        </t-button>
                        <t-button theme="success" :disabled="actionLoading || !canResume" :loading="actionLoading" @click="handleAction('resume')">
                            <span>
                                <VideoPlay />
                            </span>
                            恢复
                        </t-button>
                        <t-button theme="danger" :disabled="actionLoading || !canCancel" :loading="actionLoading" @click="handleAction('cancel')">
                            <span>
                                <CircleClose />
                            </span>
                            取消
                        </t-button>
                        <t-button theme="default" :disabled="actionLoading" @click="handleAction('reboot')">
                            <span>
                                <Refresh />
                            </span>
                            重启
                         </t-button>
                    </div>

                    <div v-if="isFatalError" class="mt-3">
                        <t-divider>
                            <t-tag theme="danger" variant="dark">紧急操作</t-tag>
                        </t-divider>
                        <t-button theme="danger" size="large" class="w-full"
                            :disabled="actionLoading" :loading="actionLoading"
                            @click="handleEmergencyStop">
                            <span>
                                <Warning />
                            </span>
                            紧急停机 (ESTOP)
                        </t-button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 抽屉底部操作区 -->
        <template #footer>
            <div class="flex justify-end p-fluid-md border-t border-gray-200">
                <t-popconfirm v-if="canManageDevice" content="确定要将此设备从该物理位置下架吗？" confirm-btn="确认下架" cancel-btn="取消"
                    theme="danger" @confirm="handleRemove">
                    <template>
                        <t-button theme="danger" variant="outline">
                            <span>
                                <Delete />
                            </span>
                            从看板下架
                        </t-button>
                    </template>
                </t-popconfirm>
            </div>
        </template>
    </t-drawer>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import {
    DeleteIcon as Delete,
    PrintIcon as Printer,
    InfoCircleFilledIcon as InfoFilled,
    DesktopIcon as Monitor,
    PauseIcon as VideoPause,
    PlayIcon as VideoPlay,
    CloseCircleIcon as CircleClose,
    ErrorCircleFilledIcon as Warning,
    LockOnIcon as Lock,
    FileAddIcon as DocumentAdd
} from 'tdesign-icons-vue-next'
import IconNozzle from '../icons/IconNozzle.vue'
import IconBed from '../icons/IconBed.vue'
import IconSpool from '../icons/IconSpool.vue'
import { PRINTER_STATE, PRINTER_STATE_MAP, PROGRESS_STATUS_MAP } from '@/utils/constants'
import { formatTemp, formatDuration, formatFilament } from '@/utils/formatters'
import { confirmSafe } from '@/api/printer'
import { startJob } from '@/api/job'
import { message } from '@/utils/message'

defineOptions({ name: 'DeviceDetailDrawer' })

// ============================================
// 响应式断点检测
// ============================================

const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)
const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1280)
const isLargeScreen = computed(() => windowWidth.value >= 1920)

// 响应式抽屉尺寸 - 使用响应式断点
const drawerSize = computed(() => {
    if (isMobile.value) return '100%'      // 移动端：全屏
    if (isTablet.value) return '70%'       // 平板：70% 宽度
    if (isLargeScreen.value) return '480px' // 大屏：固定 480px (30rem)
    return '416px'                          // 桌面：固定 416px (26rem)
})

// 响应式描述列表列数
const descriptionColumn = computed(() => {
    return isMobile.value ? 1 : 2
})

// 监听窗口大小变化
let resizeHandler = null

onMounted(() => {
    resizeHandler = () => {
        windowWidth.value = window.innerWidth
    }
    window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler)
    }
})

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
    },
    /** 是否允许维护设备和网格位置 */
    canManageDevice: {
        type: Boolean,
        default: false
    },
    /** 是否正在执行暂停、取消或急停 */
    actionLoading: {
        type: Boolean,
        default: false
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
function handleVisibleChange(value) {
    emit('update:modelValue', value)
    if (!value) emit('closed')
}

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

/** 确认现场安全 */
async function handleConfirmSafe() {
    try {
        isLoading.value = true
        await confirmSafe(props.device.id)
        message.success('现场安全确认成功！')
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
            message.error('找不到任务ID')
            return
        }
        await startJob(jobId, action)
        const successMsg = action === 'START_PRINT' ? '下发并开始打印成功！' : '仅下发文件成功！'
        message.success(successMsg)
        // 关闭抽屉
        emit('update:modelValue', false)
    } catch {
        // 错误信息由拦截器处理
    } finally {
        isLoading.value = false
    }
}
</script>

<style scoped>
.printer-detail-drawer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
}

.printer-detail-drawer :deep(.t-drawer__content-wrapper) {
    height: 100%;
}

/* ============================================
   抽屉整体样式 - 响应式优化
   ============================================ */
/* ============================================
   移动端适配
   ============================================ */
@media (max-width: 767px) {
    :deep(.t-drawer) {
        width: 100% !important;
    }

}

/* ============================================
   平板适配
   ============================================ */
@media (min-width: 768px) and (max-width: 1279px) {
    :deep(.t-drawer) {
        width: 70% !important;
    }
}

</style>
