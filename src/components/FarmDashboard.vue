<template>
  <div v-cloak class="farm-dashboard" :class="{ 'is-edit-mode': isEditMode }">
    <!-- 顶部标题和统计 -->
    <dashboard-header :status-counts="store.statusCounts" :workshop-name="workshopName"
      :last-update-time="lastUpdateTime" @refresh="handleRefresh">
      <!-- 布局锁定/编辑模式切换按钮 -->
      <template #actions>
        <el-button v-if="!isEditMode" type="default" :icon="Lock" @click="toggleEditMode">
          解锁布局
        </el-button>
        <el-button v-else type="primary" :icon="Unlock" @click="saveLayout">
          保存布局
        </el-button>
      </template>
    </dashboard-header>

    <!-- 独立车间看板容器 -->
    <div class="workshop-canvas-wrapper">
      <!-- 厂房网格布局 - 4行13列（含过道） -->
      <div class="factory-grid workshop-canvas">
        <!-- 行标签 -->
        <div class="row-labels">
          <div v-for="row in store.GRID_CONFIG.ROWS" :key="`label-${row}`" class="row-label">
            {{ store.formatRowLabel(row) }}{{ labels.rowSuffix }}
          </div>
        </div>

        <!-- 网格主体 -->
        <div class="grid-container">
          <!-- 列标题 -->
          <div class="col-headers">
            <div v-for="col in store.GRID_CONFIG.TOTAL_COLS" :key="`header-${col}`" class="col-header"
              :class="{ 'aisle-header': col === store.GRID_CONFIG.AISLE_COL }">
              <template v-if="col === store.GRID_CONFIG.AISLE_COL">{{ labels.aisle }}</template>
              <template v-else>{{ store.getPhysicalCol(col) }}</template>
            </div>
          </div>

          <!-- 设备网格 - 4行 x 13列 -->
          <div class="device-matrix">
            <template v-for="(row, rowIndex) in store.deviceMatrix" :key="`row-${rowIndex}`">
              <template v-for="(cell, colIndex) in row" :key="`cell-${rowIndex}-${colIndex}`">
                <!-- 过道占位 -->
                <div v-if="store.isAisleCell(colIndex)" class="aisle-cell">
                  <div class="aisle-indicator"></div>
                </div>

                <!-- 空槽位（可点击绑定设备） -->
                <empty-slot v-else-if="cell === null" :row-index="rowIndex" :col-index="colIndex"
                  :is-drag-over="isDragOver(rowIndex, colIndex)" @click="handleEmptySlotClick(rowIndex, colIndex)"
                  @dragenter="handleDragEnter(rowIndex, colIndex)" @dragleave="handleDragLeave"
                  @drop="handleDrop(rowIndex, colIndex)" />

                <!-- 设备卡片 -->
                <printer-card v-else :device="cell" :real-time-data="store.realTimeStatus[String(cell.id)]"
                  :row-index="rowIndex" :col-index="colIndex" :is-dragging="isDragging(cell)" :is-edit-mode="isEditMode"
                  @dragstart="handleDragStart" @dragend="handleDragEnd" @dragenter="handleDragEnter"
                  @dragleave="handleDragLeave" @drop="handleDrop" @click="openDeviceDetail" />
              </template>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 绑定设备弹窗 -->
    <bind-device-dialog v-model:visible="bindDialogVisible" :target-slot-label="targetSlotLabel"
      @confirm="performBind" />

    <!-- 设备详情抽屉 -->
    <el-drawer v-model="drawerVisible" :title="drawerTitle" size="480px" :destroy-on-close="true"
      class="printer-detail-drawer">
      <div v-if="activeDevice" class="device-detail-content">
        <!-- 实时状态概览卡片 -->
        <div class="status-overview-card" :class="`status-${currentStateClass}`">
          <div class="status-header">
            <el-tag :type="currentStateConfig.type" size="large" effect="dark" class="status-tag">
              {{ currentStateConfig.label }}
            </el-tag>
            <span v-if="activeRealTimeData?.progress !== undefined && isPrintingState" class="progress-text">
              {{ activeRealTimeData.progress }}%
            </span>
          </div>
          <div v-if="activeRealTimeData?.systemMessage && isErrorState" class="error-message">
            <el-icon>
              <warning />
            </el-icon>
            <span>{{ activeRealTimeData.systemMessage }}</span>
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
              <printer />
            </el-icon>
            打印任务
          </div>
          <div class="task-info-grid">
            <div class="task-item">
              <span class="task-label">打印时长</span>
              <span class="task-value">{{ formatDuration(activeRealTimeData?.printDuration) }}</span>
            </div>
            <div class="task-item">
              <span class="task-label">
                <IconSpool class="task-icon icon-spool" />
                已用耗材
              </span>
              <span class="task-value">{{ formatFilament(activeRealTimeData?.filamentUsed) }}</span>
            </div>
            <div v-if="isPrintingState" class="task-item full-width">
              <span class="task-label">打印进度</span>
              <el-progress :percentage="activeRealTimeData?.progress || 0" :status="progressStatus" :stroke-width="10"
                class="task-progress" />
            </div>
          </div>
        </div>

        <!-- 设备信息 -->
        <div class="detail-section">
          <div class="section-title">
            <el-icon><info-filled /></el-icon>
            设备信息
          </div>
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item label="机器编号" :span="2">
              {{ activeDevice.machineNumber || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="设备名称" :span="2">
              {{ activeDevice.name || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="IP 地址" :span="2">
              {{ activeDevice.ipAddress || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="固件类型">
              {{ activeDevice.firmwareType || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="喷头尺寸">
              {{ activeDevice.nozzleSize ? activeDevice.nozzleSize + 'mm' : '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- Moonraker / Mainsail 快捷操作 -->
        <div class="detail-section">
          <div class="section-title">
            <el-icon>
              <monitor />
            </el-icon>
            远程控制 (Moonraker / Mainsail)
          </div>
          <div class="quick-actions">
            <el-button v-if="activeDevice.ipAddress" type="primary" size="large" class="action-btn mainsail-btn" tag="a"
              :href="mainsailUrl" target="_blank" rel="noopener noreferrer">
              <el-icon>
                <monitor />
              </el-icon>
              打开 Mainsail 界面
            </el-button>

            <div class="control-grid">
              <el-button type="warning" :disabled="!canPause" @click="handlePrinterAction('pause')">
                <el-icon><video-pause /></el-icon>
                暂停打印
              </el-button>
              <el-button type="success" :disabled="!canResume" @click="handlePrinterAction('resume')">
                <el-icon><video-play /></el-icon>
                恢复打印
              </el-button>
              <el-button type="danger" :disabled="!canCancel" @click="handlePrinterAction('cancel')">
                <el-icon><circle-close /></el-icon>
                取消任务
              </el-button>
              <el-button type="info" @click="handlePrinterAction('reboot')">
                <el-icon>
                  <refresh />
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
                  <warning />
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
            confirm-button-type="danger" @confirm="handleRemoveFromBoard">
            <template #reference>
              <el-button type="danger" plain>
                <el-icon>
                  <delete />
                </el-icon>
                从看板下架
              </el-button>
            </template>
          </el-popconfirm>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
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
  Unlock
} from '@element-plus/icons-vue'
import IconNozzle from './icons/IconNozzle.vue'
import IconBed from './icons/IconBed.vue'
import IconSpool from './icons/IconSpool.vue'
import { usePrinterStore } from '@/stores/printerStore'
import { PRINTER_STATE, PRINTER_STATE_MAP, PROGRESS_STATUS_MAP } from '@/utils/constants'
import DashboardHeader from './DashboardHeader.vue'
import EmptySlot from './EmptySlot.vue'
import PrinterCard from './PrinterCard.vue'
import BindDeviceDialog from './BindDeviceDialog.vue'

defineOptions({ name: 'FarmDashboard' })

// ============================================
// Store
// ============================================

const store = usePrinterStore()

// ============================================
// Data - 中文标签配置（数据驱动，避免硬编码）
// ============================================

const labels = {
  rowSuffix: '排',
  aisle: '过道'
}

// ============================================
// Reactive State
// ============================================

/** 编辑模式状态 - 默认锁定监控模式 */
const isEditMode = ref(false)

/** 拖拽相关状态 */
const draggedDevice = ref(null)
const draggedFrom = ref(null)
const dragOverCell = ref(null)

/** 绑定设备弹窗相关状态 */
const bindDialogVisible = ref(false)
const targetSlot = ref({ row: null, col: null }) // 目标槽位坐标（物理坐标）

/** 设备详情抽屉相关状态 */
const drawerVisible = ref(false)
const activeDevice = ref(null)

/** 车间信息 */
const workshopName = ref('3F-一号车间')

/** 最后更新时间 */
const lastUpdateTime = ref('')

/**
 * 更新最后更新时间
 */
function updateLastUpdateTime() {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  lastUpdateTime.value = `${hours}:${minutes}:${seconds}`
}

// 初始化更新时间
updateLastUpdateTime()

// ============================================
// Computed Properties
// ============================================

/**
 * 目标槽位标签显示
 */
const targetSlotLabel = computed(() => {
  if (targetSlot.value.row === null || targetSlot.value.col === null) return ''
  const rowLabel = store.formatRowLabel(targetSlot.value.row)
  return `${rowLabel}-${targetSlot.value.col.toString().padStart(2, '0')}`
})

// ============================================
// Device Detail Drawer Computed Properties
// ============================================

/** 抽屉标题 */
const drawerTitle = computed(() => {
  if (!activeDevice.value) return '设备详细信息'
  return `${activeDevice.value.machineNumber || activeDevice.value.name} - 详细信息`
})

/** 当前设备的实时状态数据 */
const activeRealTimeData = computed(() => {
  if (!activeDevice.value) return null
  return store.realTimeStatus[String(activeDevice.value.id)]
})

/** 当前状态 */
const currentState = computed(() => {
  return activeRealTimeData.value?.state || PRINTER_STATE.STANDBY
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
  return activeRealTimeData.value?.toolTemperature || 0
})

/** 热床温度 */
const bedTemp = computed(() => {
  return activeRealTimeData.value?.bedTemperature || 0
})

/** Mainsail 访问地址 */
const mainsailUrl = computed(() => {
  if (!activeDevice.value?.ipAddress) return '#'
  return `http://${activeDevice.value.ipAddress}`
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
// Utility Functions
// ============================================

/**
 * 判断指定单元格是否处于拖拽悬停状态
 * @param {number} rowIndex - 行索引
 * @param {number} colIndex - 列索引
 * @returns {boolean} 是否悬停
 */
function isDragOver(rowIndex, colIndex) {
  return dragOverCell.value?.row === rowIndex && dragOverCell.value?.col === colIndex
}

/**
 * 判断设备是否正在拖拽中
 * @param {Object} device - 设备对象
 * @returns {boolean} 是否正在拖拽
 */
function isDragging(device) {
  return draggedDevice.value?.id === device.id
}

// ============================================
// Event Handlers - Drag & Drop
// ============================================

/**
 * 处理拖拽开始事件
 * @param {Object} device - 被拖拽的设备对象
 * @param {number} rowIndex - 起始行索引
 * @param {number} colIndex - 起始列索引
 */
function handleDragStart(device, rowIndex, colIndex) {
  draggedDevice.value = device
  draggedFrom.value = { row: rowIndex, col: colIndex }
}

/**
 * 处理拖拽进入事件
 * @param {number} rowIndex - 目标行索引
 * @param {number} colIndex - 目标列索引
 */
function handleDragEnter(rowIndex, colIndex) {
  // 不能放置到过道
  if (store.isAisleCell(colIndex)) return
  dragOverCell.value = { row: rowIndex, col: colIndex }
}

/**
 * 处理拖拽离开事件
 */
function handleDragLeave() {
  dragOverCell.value = null
}

/**
 * 处理拖拽结束事件
 */
function handleDragEnd() {
  draggedDevice.value = null
  draggedFrom.value = null
  dragOverCell.value = null
}

/**
 * 处理放置事件
 * @param {number} targetRowIndex - 目标行索引
 * @param {number} targetColIndex - 目标列索引
 */
async function handleDrop(targetRowIndex, targetColIndex) {
  // 防止放置到过道
  if (store.isAisleCell(targetColIndex)) return

  // 如果没有拖拽的设备，不处理
  if (!draggedDevice.value || !draggedFrom.value) return

  const fromRow = draggedFrom.value.row
  const fromCol = draggedFrom.value.col

  // 如果放置到同一位置，不处理
  if (fromRow === targetRowIndex && fromCol === targetColIndex) {
    handleDragEnd()
    return
  }

  // 计算新的物理坐标
  const newGridRow = targetRowIndex + 1
  const newGridCol = store.getPhysicalColByIndex(targetColIndex)

  // 获取目标位置的设备（如果有）
  const targetDevice = store.deviceMatrix[targetRowIndex][targetColIndex]

  try {
    if (targetDevice && typeof targetDevice === 'object') {
      // 放置到已有设备位置 - 交换位置
      await swapDevicesPosition(
        draggedDevice.value,
        { row: fromRow, col: fromCol },
        targetDevice,
        { row: targetRowIndex, col: targetColIndex }
      )
    } else {
      // 放置到空位置 - 移动设备
      await moveDeviceToEmptySlot(
        draggedDevice.value,
        { row: fromRow, col: fromCol },
        { row: newGridRow, col: newGridCol }
      )
    }

    ElMessage.success('设备位置已更新')
  } catch (error) {
    console.error('更新设备位置失败:', error)
    ElMessage.error('更新设备位置失败，请重试')
  } finally {
    handleDragEnd()
  }
}

// ============================================
// Device Operations
// ============================================

/**
 * 移动设备到空位置
 * @param {Object} device - 要移动的设备
 * @param {Object} from - 原位置 {row, col}
 * @param {Object} to - 新位置 {row, col}
 */
async function moveDeviceToEmptySlot(device, from, to) {
  const payload = [{
    id: device.id,
    gridRow: to.row,
    gridCol: to.col
  }]

  await store.updateDevicePositions(payload)
}

/**
 * 交换两台设备的位置
 * @param {Object} device1 - 第一台设备
 * @param {Object} pos1 - 第一台设备原位置 {row, col}
 * @param {Object} device2 - 第二台设备
 * @param {Object} pos2 - 第二台设备原位置 {row, col}
 */
async function swapDevicesPosition(device1, pos1, device2, pos2) {
  // 计算物理坐标
  const device1NewRow = pos2.row + 1
  const device1NewCol = store.getPhysicalColByIndex(pos2.col)
  const device2NewRow = pos1.row + 1
  const device2NewCol = store.getPhysicalColByIndex(pos1.col)

  // 批量更新两个设备的位置
  const payload = [
    {
      id: device1.id,
      gridRow: device1NewRow,
      gridCol: device1NewCol
    },
    {
      id: device2.id,
      gridRow: device2NewRow,
      gridCol: device2NewCol
    }
  ]

  await store.updateDevicePositions(payload)
}

/**
 * 处理空槽位点击事件 - 打开绑定设备弹窗
 * @param {number} rowIndex - 行索引（0-based）
 * @param {number} colIndex - 列索引（0-based）
 */
function handleEmptySlotClick(rowIndex, colIndex) {
  targetSlot.value = {
    row: rowIndex + 1,
    col: store.getPhysicalColByIndex(colIndex)
  }
  bindDialogVisible.value = true
}

/**
 * 执行设备绑定
 * @param {number} deviceId - 设备ID
 */
async function performBind(deviceId) {
  try {
    // 先调用位置更新 API
    const positionPayload = [{
      id: deviceId,
      gridRow: targetSlot.value.row,
      gridCol: targetSlot.value.col
    }]

    await store.updateDevicePositions(positionPayload)

    // 再调用打印机更新 API 设置 machineNumber
    await store.updateDevice({
      id: deviceId,
      machineNumber: targetSlotLabel.value
    })

    ElMessage.success('设备绑定成功')
    bindDialogVisible.value = false
  } catch (error) {
    console.error('绑定设备失败:', error)
    ElMessage.error('绑定设备失败，请重试')
  }
}

// ============================================
// Device Detail Drawer Functions
// ============================================

/**
 * 打开设备详情抽屉
 * @param {Object} device - 设备对象
 */
function openDeviceDetail(device) {
  activeDevice.value = device
  drawerVisible.value = true
}

/**
 * 格式化温度
 * @param {number} temp - 温度值
 * @returns {string} 格式化后的温度字符串
 */
function formatTemp(temp) {
  if (temp === undefined || temp === null) return '--°C'
  return `${Math.round(temp)}°C`
}

/**
 * 格式化时长
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时长字符串
 */
function formatDuration(seconds) {
  if (!seconds) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * 格式化耗材使用量
 * @param {number} mm - 毫米数
 * @returns {string} 格式化后的米数字符串
 */
function formatFilament(mm) {
  if (!mm) return '0.00m'
  return `${(mm / 1000).toFixed(2)}m`
}

/**
 * 处理打印机操作
 * @param {string} action - 操作类型
 */
function handlePrinterAction(action) {
  if (!activeDevice.value) return

  const actionMap = {
    pause: '暂停打印',
    resume: '恢复打印',
    cancel: '取消任务',
    reboot: '重启主机'
  }

  // TODO: 调用 Moonraker API
  ElMessage.info(`正在发送 ${actionMap[action]} 指令到 ${activeDevice.value.machineNumber}...`)
  console.log(`[Printer Action] ${action} -> ${activeDevice.value.ipAddress}`)
}

/**
 * 处理紧急停机
 */
function handleEmergencyStop() {
  if (!activeDevice.value) return

  // TODO: 调用 Moonraker ESTOP API
  ElMessage.warning(`正在发送紧急停机指令到 ${activeDevice.value.machineNumber}...`)
  console.log(`[Emergency Stop] ESTOP -> ${activeDevice.value.ipAddress}`)
}

/**
 * 处理从看板下架设备（从抽屉中操作）
 */
async function handleRemoveFromBoard() {
  if (!activeDevice.value) return

  try {
    await store.removeDeviceFromBoard(activeDevice.value.id)

    ElMessage.success(`设备 ${activeDevice.value.machineNumber} 已从看板下架`)

    // 关闭抽屉
    drawerVisible.value = false
    activeDevice.value = null
  } catch (error) {
    console.error('下架设备失败:', error)
    ElMessage.error('下架设备失败，请重试')
  }
}

// ============================================
// Layout Edit Mode Functions
// ============================================

/**
 * 切换编辑模式
 */
function toggleEditMode() {
  isEditMode.value = true
  ElMessage.info('已进入编辑模式，现在可以拖拽设备调整位置')
}

/**
 * 保存布局位置
 * 预留函数桩，用于后续对接保存到数据库的 API
 */
async function saveLayoutPositions() {
  // TODO: 实现保存布局到数据库的逻辑
  // 示例：
  // const positions = store.devices.map(device => ({
  //   id: device.id,
  //   gridRow: device.gridRow,
  //   gridCol: device.gridCol
  // }))
  // await api.saveLayoutPositions(positions)
  console.log('[saveLayoutPositions] 保存布局位置到数据库...')
}

/**
 * 保存布局并退出编辑模式
 */
async function saveLayout() {
  try {
    await saveLayoutPositions()
    isEditMode.value = false
    ElMessage.success('布局已保存')
  } catch (error) {
    console.error('保存布局失败:', error)
    ElMessage.error('保存布局失败，请重试')
  }
}

// ============================================
// Action Handlers
// ============================================

/**
 * 处理刷新按钮点击
 */
async function handleRefresh() {
  await store.fetchDeviceData()
  updateLastUpdateTime()
  ElMessage.success('状态已刷新')
}

// ============================================
// Lifecycle Hooks
// ============================================

onMounted(() => {
  // 获取设备数据并建立 WebSocket 连接
  store.fetchDeviceData()
  store.connectWs()
})

onUnmounted(() => {
  // 断开 WebSocket 连接
  store.disconnectWs()
})
</script>

<style scoped>
/* ============================================
   v-cloak: 防止 Vue 未加载完成时显示内容
   ============================================ */
[v-cloak] {
  display: none !important;
}

/* ============================================
   Layout Container
   ============================================ */
.farm-dashboard {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--ep-space-4);
  padding: var(--ep-space-4);
  background-color: var(--ep-fill-color-light);
}

/* ============================================
   Workshop Canvas Wrapper - 独立车间看板容器
   ============================================ */
.workshop-canvas-wrapper {
  position: relative;
  width: 100%;
  height: calc(100vh - 180px);
  /* 扣除 Header(60px) + DashboardHeader(~60px) + padding */
  padding: 24px;
  background: linear-gradient(145deg, #f5f7fa 0%, #e8ecf1 50%, #eef1f5 100%);
  border-radius: 12px;
  box-shadow:
    inset 0 2px 4px rgba(255, 255, 255, 0.8),
    inset 0 -2px 4px rgba(0, 0, 0, 0.05),
    0 8px 32px rgba(0, 21, 41, 0.12),
    0 2px 8px rgba(0, 21, 41, 0.08);
  overflow: auto;
  /* 美化滚动条 */
  scrollbar-width: thin;
  scrollbar-color: var(--ep-color-gray-4) transparent;
}

/* Webkit 浏览器滚动条样式 */
.workshop-canvas-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.workshop-canvas-wrapper::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 4px;
}

.workshop-canvas-wrapper::-webkit-scrollbar-thumb {
  background: var(--ep-color-gray-4);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.workshop-canvas-wrapper::-webkit-scrollbar-thumb:hover {
  background: var(--ep-color-gray-5);
}

.workshop-canvas-wrapper::-webkit-scrollbar-corner {
  background: transparent;
}

/* ============================================
   Factory Grid Layout
   ============================================ */
.factory-grid {
  display: flex;
  flex: 1;
  gap: var(--ep-space-2);
  min-width: 1400px;
  /* 确保网格不会被压缩 */
}

/* 网格容器样式 */
.grid-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: visible;
  /* 改为 visible，因为外层 wrapper 已经处理了滚动 */
}

.row-labels {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: var(--ep-space-3);
  padding-top: 32px;
  /* 列标题高度 */
  height: 100%;
}

.row-label {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 140px;
  background: var(--ep-color-gray-2);
  border-radius: var(--ep-border-radius-base);
  font-size: var(--ep-font-size-small);
  font-weight: var(--ep-font-weight-medium);
  color: var(--ep-text-color-secondary);
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.grid-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.col-headers {
  display: grid;
  grid-template-columns: repeat(13, minmax(100px, 1fr));
  gap: var(--ep-space-2);
  margin-bottom: var(--ep-space-2);
}

.col-header {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  background: var(--ep-color-gray-2);
  border-radius: var(--ep-border-radius-small);
  font-size: var(--ep-font-size-extra-small);
  font-weight: var(--ep-font-weight-medium);
  color: var(--ep-text-color-secondary);
}

.col-header.aisle-header {
  background: var(--ep-color-gray-4);
  color: var(--ep-text-color-regular);
  font-weight: var(--ep-font-weight-semibold);
}

/* ============================================
   Device Matrix Grid - 4行 x 13列
   ============================================ */
.device-matrix {
  display: grid;
  grid-template-columns: repeat(13, minmax(100px, 1fr));
  grid-template-rows: repeat(4, 140px);
  gap: var(--ep-space-3);
  flex: 1;
}

/* ============================================
   Aisle Cell - 过道占位
   ============================================ */
.aisle-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ep-color-gray-3);
  border-radius: var(--ep-border-radius-base);
  position: relative;
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
   Responsive Design - 物理空间响应式方案
   ============================================ */

/* 小屏幕适配：保持网格定宽，通过外层滚动查看 */
@media (max-width: 1400px) {
  .workshop-canvas-wrapper {
    height: calc(100vh - 160px);
  }

  /* 保持网格定宽，不压缩 */
  .factory-grid {
    min-width: 1400px;
  }
}

@media (max-width: 1200px) {
  .workshop-canvas-wrapper {
    height: calc(100vh - 140px);
    padding: 16px;
  }

  .factory-grid {
    min-width: 1400px;
    flex-direction: row;
    /* 保持横向布局 */
  }

  .row-labels {
    flex-direction: column;
    padding-top: 32px;
    padding-left: 0;
    height: 100%;
  }

  .row-label {
    width: 40px;
    height: 140px;
    writing-mode: vertical-rl;
  }
}

@media (max-width: 768px) {
  .workshop-canvas-wrapper {
    height: calc(100vh - 120px);
    padding: 12px;
    border-radius: 8px;
  }

  .factory-grid {
    min-width: 1200px;
    /* 移动端稍微减小最小宽度 */
  }
}

/* ============================================
   Device Detail Drawer Styles
   ============================================ */

/* 抽屉整体样式 */
.printer-detail-drawer :deep(.el-drawer__body) {
  padding: 0;
  overflow-y: auto;
}

.printer-detail-drawer :deep(.el-drawer__header) {
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

/* ============================================
   Edit Mode Visual Feedback - 编辑模式视觉反馈
   ============================================ */

/* 编辑模式：工程网格背景 */
.is-edit-mode .workshop-canvas {
  background-image:
    linear-gradient(to right, var(--ep-border-color-light) 1px, transparent 1px),
    linear-gradient(to bottom, var(--ep-border-color-light) 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: center center;
  border-radius: var(--ep-border-radius-base);
  padding: var(--ep-space-3);
  background-color: var(--ep-fill-color-lighter);
}

/* 编辑模式：设备卡片悬停效果 */
.is-edit-mode :deep(.device-card) {
  cursor: grab;
  transition: all 0.2s ease;
}

.is-edit-mode :deep(.device-card:hover) {
  cursor: grab;
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.is-edit-mode :deep(.device-card:active) {
  cursor: grabbing;
}

/* 编辑模式：拖拽中的卡片 */
.is-edit-mode :deep(.device-card.dragging) {
  transform: scale(1.05) rotate(2deg);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  z-index: 100;
}

/* 编辑模式：空槽位更加明显 */
.is-edit-mode :deep(.empty-slot) {
  border: 2px dashed var(--ep-color-primary-light-3);
  background: var(--ep-color-primary-light-9);
  opacity: 0.8;
}

.is-edit-mode :deep(.empty-slot:hover) {
  border-color: var(--ep-color-primary);
  background: var(--ep-color-primary-light-8);
  opacity: 1;
}

/* 编辑模式：空槽位拖拽悬停效果 */
.is-edit-mode :deep(.empty-slot.drag-over) {
  border-color: var(--ep-color-success);
  background: var(--ep-color-success-light-8);
  transform: scale(1.02);
}

/* 编辑模式：行标签和列标题高亮 */
.is-edit-mode .row-label {
  background: var(--ep-color-primary-light-7);
  color: var(--ep-color-primary);
  font-weight: var(--ep-font-weight-bold);
}

.is-edit-mode .col-header {
  background: var(--ep-color-primary-light-7);
  color: var(--ep-color-primary);
  font-weight: var(--ep-font-weight-bold);
}

.is-edit-mode .col-header.aisle-header {
  background: var(--ep-color-gray-4);
  color: var(--ep-text-color-regular);
}

/* 编辑模式：过道区域淡化 */
.is-edit-mode .aisle-cell {
  background: var(--ep-color-gray-4);
  opacity: 0.6;
}
</style>
