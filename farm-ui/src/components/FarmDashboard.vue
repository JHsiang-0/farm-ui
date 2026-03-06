<template>
  <div class="farm-dashboard">
    <!-- 顶部标题和统计 -->
    <dashboard-header
      :status-counts="store.statusCounts"
      @refresh="handleRefresh"
    />

    <!-- 厂房网格布局 - 4行13列（含过道） -->
    <div class="factory-grid">
      <!-- 行标签 -->
      <div class="row-labels">
        <div v-for="row in store.GRID_CONFIG.ROWS" :key="`label-${row}`" class="row-label">
          {{ store.formatRowLabel(row) }}排
        </div>
      </div>

      <!-- 网格主体 -->
      <div class="grid-container">
        <!-- 列标题 -->
        <div class="col-headers">
          <div
            v-for="col in store.GRID_CONFIG.TOTAL_COLS"
            :key="`header-${col}`"
            class="col-header"
            :class="{ 'aisle-header': col === store.GRID_CONFIG.AISLE_COL }"
          >
            <template v-if="col === store.GRID_CONFIG.AISLE_COL">过道</template>
            <template v-else>{{ store.getPhysicalCol(col) }}</template>
          </div>
        </div>

        <!-- 设备网格 - 4行 x 13列 -->
        <div class="device-matrix">
          <template v-for="(row, rowIndex) in store.deviceMatrix" :key="`row-${rowIndex}`">
            <template v-for="(cell, colIndex) in row" :key="`cell-${rowIndex}-${colIndex}`">
              <!-- 过道占位 -->
              <div
                v-if="store.isAisleCell(colIndex)"
                class="aisle-cell"
              >
                <div class="aisle-indicator"></div>
              </div>

              <!-- 空槽位（可点击绑定设备） -->
              <empty-slot
                v-else-if="cell === null"
                :row-index="rowIndex"
                :col-index="colIndex"
                :is-drag-over="isDragOver(rowIndex, colIndex)"
                @click="handleEmptySlotClick(rowIndex, colIndex)"
                @dragenter="handleDragEnter(rowIndex, colIndex)"
                @dragleave="handleDragLeave"
                @drop="handleDrop(rowIndex, colIndex)"
              />

              <!-- 设备卡片 -->
              <printer-card
                v-else
                :device="cell"
                :real-time-data="store.realTimeStatus[String(cell.id)]"
                :row-index="rowIndex"
                :col-index="colIndex"
                :is-dragging="isDragging(cell)"
                @dragstart="handleDragStart"
                @dragend="handleDragEnd"
                @dragenter="handleDragEnter"
                @dragleave="handleDragLeave"
                @drop="handleDrop"
                @click="openDeviceDetail"
              />
            </template>
          </template>
        </div>
      </div>
    </div>

    <!-- 绑定设备弹窗 -->
    <bind-device-dialog
      v-model:visible="bindDialogVisible"
      :target-slot-label="targetSlotLabel"
      @confirm="performBind"
    />

    <!-- 设备详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="设备详细信息"
      size="400px"
      :destroy-on-close="true"
    >
      <div v-if="activeDevice" class="device-detail-content">
        <!-- 设备信息描述列表 -->
        <el-descriptions :column="1" border>
          <el-descriptions-item label="机器编号">
            {{ activeDevice.machineNumber || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="设备名称">
            {{ activeDevice.name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="IP 地址">
            <div class="ip-address-row">
              <span>{{ activeDevice.ipAddress || '-' }}</span>
              <el-button
                v-if="activeDevice.ipAddress"
                type="primary"
                tag="a"
                :href="'http://' + activeDevice.ipAddress"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
              >
                <el-icon><link /></el-icon>
                进入 Mainsail
              </el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="MAC 地址">
            {{ activeDevice.macAddress || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="固件类型">
            {{ activeDevice.firmwareType || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="喷头尺寸">
            {{ activeDevice.nozzleSize ? activeDevice.nozzleSize + 'mm' : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="当前耗材">
            {{ activeDevice.currentMaterial || '无耗材' }}
          </el-descriptions-item>
          <el-descriptions-item label="设备状态">
            <el-tag :type="getStatusType(activeDevice.status)" size="small">
              {{ getStatusLabel(activeDevice.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="activeDevice.currentJobId" label="当前任务">
            #{{ activeDevice.currentJobId }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 抽屉底部操作区 -->
      <template #footer>
        <div class="drawer-footer">
          <el-popconfirm
            title="确定要将此设备从该物理位置下架吗？"
            confirm-button-text="确认下架"
            cancel-button-text="取消"
            confirm-button-type="danger"
            @confirm="handleRemoveFromBoard"
          >
            <template #reference>
              <el-button type="danger" plain>
                <el-icon><delete /></el-icon>
                从看板下架 (移除)
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
import { Delete } from '@element-plus/icons-vue'
import { usePrinterStore } from '@/stores/printerStore'
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
// Reactive State
// ============================================

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

// ============================================
// Computed Properties
// ============================================

/**
 * 目标槽位标签显示
 */
const targetSlotLabel = computed(() => {
  if (targetSlot.value.row === null || targetSlot.value.col === null) return ''
  const rowLabel = store.formatRowLabel(targetSlot.value.row)
  return `${rowLabel}-${targetSlot.value.row.toString().padStart(2, '0')}`
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
 * 获取状态标签类型
 * @param {string} status - 设备状态
 * @returns {string} Element Plus 标签类型
 */
function getStatusType(status) {
  const typeMap = {
    ONLINE: 'success',
    IDLE: 'success',
    OFFLINE: 'info',
    PRINTING: 'primary',
    ERROR: 'danger'
  }
  return typeMap[status] || 'info'
}

/**
 * 获取状态显示标签
 * @param {string} status - 设备状态
 * @returns {string} 状态标签文本
 */
function getStatusLabel(status) {
  const labelMap = {
    ONLINE: '在线',
    IDLE: '空闲',
    OFFLINE: '离线',
    PRINTING: '打印中',
    ERROR: '故障'
  }
  return labelMap[status] || status
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
// Action Handlers
// ============================================

/**
 * 处理刷新按钮点击
 */
async function handleRefresh() {
  await store.fetchDeviceData()
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
   Factory Grid Layout
   ============================================ */
.factory-grid {
  display: flex;
  flex: 1;
  gap: var(--ep-space-2);
  overflow: hidden;
}

.row-labels {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: var(--ep-space-3);
  padding-top: 32px; /* 列标题高度 */
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
  overflow: auto;
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
  background: repeating-linear-gradient(
    to bottom,
    var(--ep-color-gray-5) 0,
    var(--ep-color-gray-5) 4px,
    transparent 4px,
    transparent 8px
  );
  opacity: 0.4;
}

/* ============================================
   Responsive Design
   ============================================ */
@media (max-width: 1400px) {
  .device-matrix {
    grid-template-columns: repeat(13, minmax(90px, 1fr));
  }

  .col-headers {
    grid-template-columns: repeat(13, minmax(90px, 1fr));
  }
}

@media (max-width: 1200px) {
  .factory-grid {
    flex-direction: column;
  }

  .row-labels {
    flex-direction: row;
    padding-top: 0;
    padding-left: 32px;
    height: auto;
  }

  .row-label {
    width: 100px;
    height: 30px;
    writing-mode: horizontal-tb;
  }
}

/* ============================================
   Device Detail Drawer Styles
   ============================================ */
.device-detail-content {
  padding: var(--ep-space-4);
}

.ip-address-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ep-space-2);
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  padding: var(--ep-space-3) var(--ep-space-4);
}
</style>
