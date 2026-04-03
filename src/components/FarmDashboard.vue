<template>
  <div v-cloak class="h-full bg-gray-100 flex flex-col overflow-hidden">
    <!-- 顶部标题和统计 -->
    <div class="p-4 pb-0">
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
    </div>

    <!-- 独立车间看板容器 -->
    <div class="relative w-full flex-1 p-4 m-4 mt-2 bg-gray-100 border border-gray-200 rounded-xl shadow-sm overflow-auto flex items-start justify-center"
      style="scrollbar-width: thin; scrollbar-color: #d1d5db transparent;">
      <!-- 滚动条样式（WebKit） -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none"
        style="mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);">
        <div class="w-full h-full"></div>
      </div>

      <!-- 厂房网格布局 - 4行13列（含过道） -->
      <div class="flex shrink-0 gap-2" style="width: 1452px;">
        <!-- 使用 GridMap 组件 -->
        <grid-map :device-matrix="store.deviceMatrix" :real-time-status="store.realTimeStatus"
          :grid-config="store.GRID_CONFIG" :is-edit-mode="isEditMode" :dragged-device="draggedDevice"
          :drag-over-cell="dragOverCell" @dragstart="handleDragStart" @dragend="handleDragEnd"
          @dragenter="handleDragEnter" @dragleave="handleDragLeave" @drop="handleDrop" @cell-click="handleCellClick" />
      </div>
    </div>

    <!-- 绑定设备弹窗 -->
    <bind-device-dialog v-model:visible="bindDialogVisible" :target-slot-label="targetSlotLabel"
      @confirm="performBind" />

    <!-- 设备详情抽屉 - 使用 DeviceDetailDrawer 组件 -->
    <device-detail-drawer v-model="drawerVisible" :device="activeDevice" :real-time-data="activeRealTimeData"
      @action="handlePrinterAction" @emergency-stop="handleEmergencyStop" @remove="handleRemoveFromBoard"
      @closed="handleDrawerClosed" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Lock, Unlock } from '@element-plus/icons-vue'
import { usePrinterStore } from '@/stores/printer'
import DashboardHeader from './DashboardHeader.vue'
import GridMap from './grid/GridMap.vue'
import BindDeviceDialog from './BindDeviceDialog.vue'
import DeviceDetailDrawer from './device/DeviceDetailDrawer.vue'

defineOptions({ name: 'FarmDashboard' })

// ============================================
// Store
// ============================================

const store = usePrinterStore()

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
  const rowLabel = String.fromCharCode(65 + targetSlot.value.row - 1)
  return `${rowLabel}-${targetSlot.value.col.toString().padStart(2, '0')}`
})

/** 当前设备的实时状态数据 */
const activeRealTimeData = computed(() => {
  if (!activeDevice.value) return null
  return store.realTimeStatus[String(activeDevice.value.id)]
})

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
 * 处理单元格点击事件
 * @param {Object} device - 设备对象（可能为 null）
 * @param {number} rowIndex - 行索引（0-based）
 * @param {number} colIndex - 列索引（0-based）
 */
function handleCellClick(device, rowIndex, colIndex) {
  // 锁定布局时禁止点击空槽位绑定设备
  if (!device && !isEditMode.value) {
    return
  }

  if (device) {
    // 点击设备 - 打开详情抽屉
    activeDevice.value = device
    drawerVisible.value = true
  } else {
    // 点击空槽位 - 打开绑定弹窗（仅在编辑模式下）
    targetSlot.value = {
      row: rowIndex + 1,
      col: store.getPhysicalColByIndex(colIndex)
    }
    bindDialogVisible.value = true
  }
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
 * 处理打印机操作
 * @param {string} action - 操作类型
 * @param {Object} device - 设备对象
 */
function handlePrinterAction(action, device) {
  const actionMap = {
    pause: '暂停打印',
    resume: '恢复打印',
    cancel: '取消任务',
    reboot: '重启主机'
  }

  // TODO: 调用 Moonraker API
  ElMessage.info(`正在发送 ${actionMap[action]} 指令到 ${device.machineNumber}...`)
  console.log(`[Printer Action] ${action} -> ${device.ipAddress}`)
}

/**
 * 处理紧急停机
 * @param {Object} device - 设备对象
 */
function handleEmergencyStop(device) {
  // TODO: 调用 Moonraker ESTOP API
  ElMessage.warning(`正在发送紧急停机指令到 ${device.machineNumber}...`)
  console.log(`[Emergency Stop] ESTOP -> ${device.ipAddress}`)
}

/**
 * 处理从看板下架设备
 * @param {Object} device - 设备对象
 */
async function handleRemoveFromBoard(device) {
  try {
    await store.removeDeviceFromBoard(device.id)

    ElMessage.success(`设备 ${device.machineNumber} 已从看板下架`)

    // 关闭抽屉
    drawerVisible.value = false
    activeDevice.value = null
  } catch (error) {
    console.error('下架设备失败:', error)
    ElMessage.error('下架设备失败，请重试')
  }
}

/**
 * 处理抽屉关闭事件
 */
function handleDrawerClosed() {
  activeDevice.value = null
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
 * 处理刷新按钮点击 - 刷新打印机 WebSocket 状态
 * 1. 断开现有 WebSocket 连接
 * 2. 重新获取设备数据
 * 3. 重新建立 WebSocket 连接
 */
async function handleRefresh() {
  try {
    // 先断开现有 WebSocket 连接
    store.disconnectWs()
    ElMessage.info('正在重新连接打印机...')

    // 重新获取设备数据并建立 WebSocket 连接
    await store.fetchDeviceData()
    store.connectWs()

    updateLastUpdateTime()
    ElMessage.success('打印机状态已刷新')
  } catch (error) {
    console.error('刷新打印机状态失败:', error)
    ElMessage.error('刷新打印机状态失败，请重试')
  }
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
   编辑模式视觉反馈
   ============================================ */

/* 编辑模式：工程网格背景 */
.is-edit-mode :deep(.workshop-canvas) {
  background-image:
    linear-gradient(to right, #e5e7eb 1px, transparent 1px),
    linear-gradient(to bottom, #e5e7eb 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: center center;
  border-radius: 6px;
  background-color: #f3f4f6;
}

/* 编辑模式：行标签和列标题高亮 */
.is-edit-mode :deep(.row-label) {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 700;
}

.is-edit-mode :deep(.col-header) {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 700;
}

.is-edit-mode :deep(.col-header.aisle-header) {
  background: #e8e0d0;
  color: #7a6545;
}

/* 编辑模式：过道区域淡化 */
.is-edit-mode :deep(.aisle-cell) {
  background: #e8e0d0;
  border: 2px dashed #c4b8a0;
  opacity: 0.8;
}

/* 滚动条样式 */
:deep(.workshop-canvas-wrapper::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(.workshop-canvas-wrapper::-webkit-scrollbar-track) {
  background: transparent;
  border-radius: 4px;
}

:deep(.workshop-canvas-wrapper::-webkit-scrollbar-thumb) {
  background: #d1d5db;
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

:deep(.workshop-canvas-wrapper::-webkit-scrollbar-thumb:hover) {
  background: #9ca3af;
}

:deep(.workshop-canvas-wrapper::-webkit-scrollbar-corner) {
  background: transparent;
}

/* 响应式适配 */
@media (max-width: 1400px) {
  .workshop-canvas-wrapper {
    height: calc(100vh - 190px);
  }
}

@media (max-width: 1200px) {
  .workshop-canvas-wrapper {
    height: calc(100vh - 180px);
    padding: 16px;
  }
}

@media (max-width: 768px) {
  .workshop-canvas-wrapper {
    height: calc(100vh - 160px);
    padding: 12px;
    border-radius: 12px;
  }
}
</style>
