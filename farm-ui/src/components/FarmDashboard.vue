<template>
  <div class="farm-dashboard">
    <!-- 顶部标题和统计 -->
    <dashboard-header
      :status-counts="statusCounts"
      @refresh="handleRefresh"
    />

    <!-- 厂房网格布局 - 4行13列（含过道） -->
    <div class="factory-grid">
      <!-- 行标签 -->
      <div class="row-labels">
        <div v-for="row in GRID_CONFIG.ROWS" :key="`label-${row}`" class="row-label">
          {{ formatRowLabel(row) }}排
        </div>
      </div>

      <!-- 网格主体 -->
      <div class="grid-container">
        <!-- 列标题 -->
        <div class="col-headers">
          <div
            v-for="col in GRID_CONFIG.TOTAL_COLS"
            :key="`header-${col}`"
            class="col-header"
            :class="{ 'aisle-header': col === GRID_CONFIG.AISLE_COL }"
          >
            <template v-if="col === GRID_CONFIG.AISLE_COL">过道</template>
            <template v-else>{{ getPhysicalCol(col) }}</template>
          </div>
        </div>

        <!-- 设备网格 - 4行 x 13列 -->
        <div class="device-matrix">
          <template v-for="(row, rowIndex) in deviceMatrix" :key="`row-${rowIndex}`">
            <template v-for="(cell, colIndex) in row" :key="`cell-${rowIndex}-${colIndex}`">
              <!-- 过道占位 -->
              <div
                v-if="isAisleCell(colIndex)"
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
                :row-index="rowIndex"
                :col-index="colIndex"
                :is-dragging="isDragging(cell)"
                @dragstart="handleDragStart"
                @dragend="handleDragEnd"
                @dragenter="handleDragEnter"
                @dragleave="handleDragLeave"
                @drop="handleDrop"
                @detail="handleDetail"
                @start="handleStart"
                @pause="handlePause"
                @remove="handleRemove"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getPrinterList,
  batchUpdatePositions,
  updatePrinter
} from '@/api/printer'
import DashboardHeader from './DashboardHeader.vue'
import EmptySlot from './EmptySlot.vue'
import PrinterCard from './PrinterCard.vue'
import BindDeviceDialog from './BindDeviceDialog.vue'

defineOptions({ name: 'FarmDashboard' })

// ============================================
// Constants & Config
// ============================================

/**
 * 网格配置常量
 * @constant {Object}
 */
const GRID_CONFIG = {
  ROWS: 4,
  COLS: 12, // 实际设备列数
  TOTAL_COLS: 13, // 包含过道的总列数
  AISLE_COL: 8, // 过道在第8列（视觉位置，1-based）
  AISLE_COL_INDEX: 7 // 过道列的数组索引（0-based）
}

/** ASCII 码常量 */
const ASCII = {
  UPPER_A: 65 // 'A' 的 ASCII 码
}

// ============================================
// Reactive State
// ============================================

/** 原始设备数据列表 */
const rawDeviceList = ref([])

/** 加载状态 */
const loading = ref(false)

/** 拖拽相关状态 */
const draggedDevice = ref(null)
const draggedFrom = ref(null)
const dragOverCell = ref(null)

/** 绑定设备弹窗相关状态 */
const bindDialogVisible = ref(false)
const targetSlot = ref({ row: null, col: null }) // 目标槽位坐标（物理坐标）

// ============================================
// Computed Properties
// ============================================

/**
 * 目标槽位标签显示
 */
const targetSlotLabel = computed(() => {
  if (targetSlot.value.row === null || targetSlot.value.col === null) return ''
  const rowLabel = formatRowLabel(targetSlot.value.row)
  return `${rowLabel}-${targetSlot.value.col.toString().padStart(2, '0')}`
})

/**
 * 将扁平设备数组转换为4行13列的二维矩阵（包含过道列）
 * 矩阵结构：每行13列，第8列为过道（固定为'aisle'标识）
 * @returns {Array<Array<Object|null|string>>} 4x13的设备矩阵，过道位置为'aisle'字符串
 */
const deviceMatrix = computed(() => {
  const matrix = []

  for (let row = 1; row <= GRID_CONFIG.ROWS; row++) {
    const rowData = []
    for (let col = 1; col <= GRID_CONFIG.TOTAL_COLS; col++) {
      // 过道位置
      if (col === GRID_CONFIG.AISLE_COL) {
        rowData.push('aisle')
        continue
      }

      // 计算物理列号（排除过道）
      const physicalCol = getPhysicalCol(col)

      // 在原始数据中查找对应坐标的设备（后端使用驼峰命名 gridRow/gridCol）
      const device = rawDeviceList.value.find(
        d => d.gridRow === row && d.gridCol === physicalCol
      )
      rowData.push(device || null)
    }
    matrix.push(rowData)
  }

  return matrix
})

/**
 * 各状态设备数量统计
 * @returns {Object} 状态计数对象
 */
const statusCounts = computed(() => {
  const counts = {
    ONLINE: 0,
    OFFLINE: 0,
    PRINTING: 0,
    ERROR: 0,
    IDLE: 0
  }

  rawDeviceList.value.forEach(device => {
    const status = device.status
    if (Object.prototype.hasOwnProperty.call(counts, status)) {
      counts[status]++
    }
    // ONLINE状态视为空闲
    if (status === 'ONLINE') {
      counts.IDLE++
    }
  })

  return counts
})

// ============================================
// Utility Functions
// ============================================

/**
 * 格式化行标签（数字转字母）
 * @param {number} row - 行号（1-based）
 * @returns {string} 行标签（如 A, B, C...）
 */
function formatRowLabel(row) {
  return String.fromCharCode(ASCII.UPPER_A + row - 1)
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
  // 过道右侧的列，物理列号减1
  return gridCol - 1
}

/**
 * 根据矩阵列索引获取物理列号
 * @param {number} colIndex - 矩阵列索引（0-12）
 * @returns {number} 物理列号（1-12）
 */
function getPhysicalColByIndex(colIndex) {
  return getPhysicalCol(colIndex + 1)
}

/**
 * 判断是否为过道单元格
 * @param {number} colIndex - 列索引（0-based）
 * @returns {boolean} 是否为过道
 */
function isAisleCell(colIndex) {
  return colIndex === GRID_CONFIG.AISLE_COL_INDEX
}

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
  if (isAisleCell(colIndex)) return
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
  if (isAisleCell(targetColIndex)) return

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
  const newGridCol = getPhysicalColByIndex(targetColIndex)

  // 获取目标位置的设备（如果有）
  const targetDevice = deviceMatrix.value[targetRowIndex][targetColIndex]

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

  await batchUpdatePositions(payload)
  await fetchDeviceData()
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
  const device1NewCol = getPhysicalColByIndex(pos2.col)
  const device2NewRow = pos1.row + 1
  const device2NewCol = getPhysicalColByIndex(pos1.col)

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

  await batchUpdatePositions(payload)
  await fetchDeviceData()
}

/**
 * 处理空槽位点击事件 - 打开绑定设备弹窗
 * @param {number} rowIndex - 行索引（0-based）
 * @param {number} colIndex - 列索引（0-based）
 */
function handleEmptySlotClick(rowIndex, colIndex) {
  targetSlot.value = {
    row: rowIndex + 1,
    col: getPhysicalColByIndex(colIndex)
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

    await batchUpdatePositions(positionPayload)

    // 再调用打印机更新 API 设置 machineNumber
    await updatePrinter({
      id: deviceId,
      machineNumber: targetSlotLabel.value
    })

    ElMessage.success('设备绑定成功')
    bindDialogVisible.value = false

    // 刷新看板数据
    await fetchDeviceData()
  } catch (error) {
    console.error('绑定设备失败:', error)
    ElMessage.error('绑定设备失败，请重试')
  }
}

/**
 * 从看板移除设备（解绑）
 * @param {Object} device - 要移除的设备对象
 */
async function handleRemove(device) {
  try {
    const payload = [{
      id: device.id,
      gridRow: null,
      gridCol: null
    }]

    await batchUpdatePositions(payload)

    ElMessage.success(`设备 ${device.machineNumber} 已从看板移除`)

    await fetchDeviceData()
  } catch (error) {
    console.error('移除设备失败:', error)
    ElMessage.error('移除设备失败，请重试')
  }
}

// ============================================
// Action Handlers
// ============================================

/**
 * 处理刷新按钮点击
 */
function handleRefresh() {
  fetchDeviceData()
  ElMessage.success('状态已刷新')
}

/**
 * 查看设备详情
 * @param {Object} device - 设备对象
 */
function handleDetail(device) {
  ElMessage.info(`查看设备详情: ${device.machineNumber}`)
  console.log('Device detail:', device)
}

/**
 * 开始打印任务
 * @param {Object} device - 设备对象
 */
function handleStart(device) {
  ElMessage.success(`启动设备: ${device.machineNumber}`)
  console.log('Start device:', device)
}

/**
 * 暂停打印任务
 * @param {Object} device - 设备对象
 */
function handlePause(device) {
  ElMessage.warning(`暂停设备: ${device.machineNumber}`)
  console.log('Pause device:', device)
}

// ============================================
// Data Fetching
// ============================================

/**
 * 获取设备数据
 */
async function fetchDeviceData() {
  loading.value = true
  try {
    const response = await getPrinterList({ pageSize: 1000 })
    // 只保留有坐标的设备（在看板上显示的）
    // 注意：gridRow 和 gridCol 是数字类型，需要判断是否为有效数字
    const records = response.data?.records || []
    rawDeviceList.value = records.filter(d => {
      const hasValidRow = typeof d.gridRow === 'number' && d.gridRow > 0
      const hasValidCol = typeof d.gridCol === 'number' && d.gridCol > 0
      return hasValidRow && hasValidCol
    })
  } catch (error) {
    console.error('获取设备数据失败:', error)
    ElMessage.error('获取设备数据失败')
    // 降级使用模拟数据
    rawDeviceList.value = generateMockData()
  } finally {
    loading.value = false
  }
}

/**
 * 生成模拟设备数据（用于开发测试）
 * @returns {Array<Object>} 模拟设备数组
 */
function generateMockData() {
  const devices = []
  const statuses = ['ONLINE', 'OFFLINE', 'PRINTING', 'ERROR']
  const materials = ['PLA', 'ABS', 'PETG', 'TPU', 'ASA', null]
  const nozzleSizes = ['0.4', '0.6', '0.8']

  // 随机填充约70%的位置
  for (let row = 1; row <= GRID_CONFIG.ROWS; row++) {
    for (let col = 1; col <= GRID_CONFIG.COLS; col++) {
      if (Math.random() > 0.3) {
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const rowLabel = formatRowLabel(row)

        devices.push({
          id: `printer_${row}_${col}`,
          name: `打印机 ${rowLabel}-${col}`,
          ipAddress: `192.168.1.${100 + row * 12 + col}`,
          macAddress: `AA:BB:CC:DD:${row.toString(16).padStart(2, '0')}:${col.toString(16).padStart(2, '0')}`,
          firmwareType: Math.random() > 0.5 ? 'Klipper' : 'Marlin',
          status: status,
          currentJobId: status === 'PRINTING' ? Math.floor(Math.random() * 10000) : null,
          currentMaterial: materials[Math.floor(Math.random() * materials.length)],
          nozzleSize: nozzleSizes[Math.floor(Math.random() * nozzleSizes.length)],
          gridRow: row,
          gridCol: col,
          machineNumber: `#${rowLabel}-${col.toString().padStart(2, '0')}`
        })
      }
    }
  }

  return devices
}

// ============================================
// Lifecycle Hooks
// ============================================

onMounted(() => {
  fetchDeviceData()
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
  background-color: var(--ep-background-color-base);
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
</style>
