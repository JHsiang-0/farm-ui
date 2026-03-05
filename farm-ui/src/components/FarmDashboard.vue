<template>
  <div class="farm-dashboard">
    <!-- 顶部标题和统计 -->
    <div class="dashboard-header">
      <div class="header-left">
        <h2 class="dashboard-title">
          <el-icon :size="24"><office-building /></el-icon>
          3楼车间
        </h2>
        <div class="stats-bar">
          <el-tag type="success" effect="dark" size="small">
            <el-icon><circle-check /></el-icon>
            在线: {{ statusCounts.ONLINE }}
          </el-tag>
          <el-tag type="primary" effect="dark" size="small">
            <el-icon><printer /></el-icon>
            打印中: {{ statusCounts.PRINTING }}
          </el-tag>
          <el-tag type="info" effect="dark" size="small">
            <el-icon><timer /></el-icon>
            空闲: {{ statusCounts.IDLE }}
          </el-tag>
          <el-tag type="danger" effect="dark" size="small">
            <el-icon><circle-close /></el-icon>
            离线: {{ statusCounts.OFFLINE }}
          </el-tag>
          <el-tag type="warning" effect="dark" size="small">
            <el-icon><warning /></el-icon>
            故障: {{ statusCounts.ERROR }}
          </el-tag>
        </div>
      </div>
      <div class="header-right">
        <el-button type="primary" plain size="small" @click="handleRefresh">
          <el-icon><refresh /></el-icon>
          刷新状态
        </el-button>
      </div>
    </div>

    <!-- 厂房网格布局 - 4行13列（含过道） -->
    <div class="factory-grid">
      <!-- 行标签 -->
      <div class="row-labels">
        <div v-for="row in GRID_CONFIG.ROWS" :key="`label-${row}`" class="row-label">
          {{ String.fromCharCode(64 + row) }}排
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
                v-if="colIndex === GRID_CONFIG.AISLE_COL_INDEX"
                class="aisle-cell"
              >
                <div class="aisle-indicator"></div>
              </div>

              <!-- 空槽位（可点击绑定设备） -->
              <div
                v-else-if="cell === null"
                class="empty-slot"
                :class="{ 'drag-over': dragOverCell && dragOverCell.row === rowIndex && dragOverCell.col === colIndex }"
                :data-row="rowIndex"
                :data-col="colIndex"
                @click="handleEmptySlotClick(rowIndex, colIndex)"
                @dragover.prevent
                @dragenter.prevent="handleDragEnter(rowIndex, colIndex)"
                @dragleave="handleDragLeave"
                @drop="handleDrop(rowIndex, colIndex)"
              >
                <el-icon :size="20"><box /></el-icon>
                <span class="slot-text">暂无设备</span>
                <span class="slot-coord">{{ formatCoordinate(rowIndex + 1, getPhysicalColByIndex(colIndex)) }}</span>
              </div>

              <!-- 设备卡片（可拖动） -->
              <el-card
                v-else
                class="device-card"
                :class="[`status-${cell.status?.toLowerCase()}`, { 'dragging': draggedDevice && draggedDevice.id === cell.id }]"
                shadow="hover"
                draggable="true"
                :data-device-id="cell.id"
                :data-row="rowIndex"
                :data-col="colIndex"
                @dragstart="handleDragStart(cell, rowIndex, colIndex)"
                @dragend="handleDragEnd"
                @dragover.prevent
                @dragenter.prevent="handleDragEnter(rowIndex, colIndex)"
                @dragleave="handleDragLeave"
                @drop="handleDrop(rowIndex, colIndex)"
              >
                <!-- 卡片头部：机器编号和状态 -->
                <div class="card-header">
                  <span class="machine-number">{{ cell.machineNumber || '-' }}</span>
                  <div class="status-wrapper">
                    <el-tag :type="getStatusType(cell.status)" size="small" effect="plain">
                      {{ getStatusLabel(cell.status) }}
                    </el-tag>
                    <div class="status-dot" :class="cell.status?.toLowerCase()"></div>
                  </div>
                </div>

                <!-- 卡片内容区 -->
                <div class="card-content">
                  <div class="info-row">
                    <el-icon :size="12"><connection /></el-icon>
                    <span class="info-text" :title="cell.ipAddress">{{ cell.ipAddress || '-' }}</span>
                  </div>
                  <div class="info-row">
                    <el-icon :size="12"><coin /></el-icon>
                    <span class="info-text" :title="cell.currentMaterial">{{ cell.currentMaterial || '无耗材' }}</span>
                  </div>
                  <div class="info-row">
                    <el-icon :size="12"><tools /></el-icon>
                    <span class="info-text">喷头: {{ cell.nozzleSize ? cell.nozzleSize + 'mm' : '-' }}</span>
                  </div>
                  <div v-if="cell.currentJobId" class="info-row job-info">
                    <el-icon :size="12"><document /></el-icon>
                    <span class="info-text">任务 #{{ cell.currentJobId }}</span>
                  </div>
                </div>

                <!-- 底部操作区 -->
                <div class="card-actions">
                  <el-button-group size="small">
                    <el-button type="primary" plain @click="handleDetail(cell)">
                      <el-icon><zoom-in /></el-icon>
                    </el-button>
                    <el-button
                      v-if="cell.status === 'ONLINE'"
                      type="success"
                      plain
                      @click="handleStart(cell)"
                    >
                      <el-icon><video-play /></el-icon>
                    </el-button>
                    <el-button
                      v-if="cell.status === 'PRINTING'"
                      type="warning"
                      plain
                      @click="handlePause(cell)"
                    >
                      <el-icon><video-pause /></el-icon>
                    </el-button>
                    <!-- 移除设备按钮（带二次确认） -->
                    <el-popconfirm
                      title="确定要将此设备从当前物理位置移除吗？"
                      confirm-button-text="确认"
                      cancel-button-text="取消"
                      confirm-button-type="danger"
                      @confirm="handleRemove(cell)"
                    >
                      <template #reference>
                        <el-button type="danger" plain>
                          <el-icon><delete /></el-icon>
                        </el-button>
                      </template>
                    </el-popconfirm>
                  </el-button-group>
                </div>
              </el-card>
            </template>
          </template>
        </div>
      </div>
    </div>

    <!-- 绑定设备弹窗 -->
    <el-dialog
      v-model="bindDialogVisible"
      :title="`绑定设备至 ${targetSlotLabel}`"
      width="700px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <!-- 搜索框 -->
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="请输入 IP 或机器编号搜索"
          clearable
          prefix-icon="Search"
          @input="handleSearch"
        />
      </div>

      <!-- 未分配设备列表 -->
      <el-table
        v-loading="unallocatedLoading"
        :data="filteredUnallocatedList"
        height="400"
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="machineNumber" label="机器编号" width="120">
          <template #default="{ row }">
            {{ row.machineNumber || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="ipAddress" label="IP地址" width="125" />
        <el-table-column prop="macAddress" label="MAC地址" width="145" />
        <el-table-column prop="name" label="设备名称" width="130" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="85">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态提示 -->
      <el-empty v-if="!unallocatedLoading && filteredUnallocatedList.length === 0" description="暂无可绑定的设备" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  OfficeBuilding,
  CircleCheck,
  Printer,
  Timer,
  CircleClose,
  Warning,
  Refresh,
  Box,
  Connection,
  Coin,
  Tools,
  Document,
  VideoPlay,
  VideoPause,
  Delete,
  ZoomIn
} from '@element-plus/icons-vue'
import {
  getPrinterList,
  getUnallocatedPrinters,
  batchUpdatePositions,
  updatePrinter
} from '@/api/printer'

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

/** 状态映射配置 */
const STATUS_MAP = {
  ONLINE: { label: '在线', type: 'success' },
  OFFLINE: { label: '离线', type: 'info' },
  PRINTING: { label: '打印中', type: 'primary' },
  ERROR: { label: '故障', type: 'danger' },
  IDLE: { label: '空闲', type: 'success' }
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
const unallocatedList = ref([])
const unallocatedLoading = ref(false)
const selectedDeviceId = ref(null)
const bindLoading = ref(false)
const targetSlot = ref({ row: null, col: null }) // 目标槽位坐标（物理坐标）

/** 搜索相关状态 */
const searchKeyword = ref('')

// ============================================
// Computed Properties
// ============================================

/**
 * 目标槽位标签显示
 */
const targetSlotLabel = computed(() => {
  if (targetSlot.value.row === null || targetSlot.value.col === null) return ''
  const rowLabel = String.fromCharCode(64 + targetSlot.value.row)
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

/**
 * 根据搜索关键词过滤未分配设备列表
 * @returns {Array} 过滤后的设备列表
 */
const filteredUnallocatedList = computed(() => {
  if (!searchKeyword.value.trim()) {
    return unallocatedList.value
  }

  const keyword = searchKeyword.value.toLowerCase().trim()
  return unallocatedList.value.filter(device => {
    const ipMatch = device.ipAddress && device.ipAddress.toLowerCase().includes(keyword)
    const machineNumMatch = device.machineNumber && device.machineNumber.toLowerCase().includes(keyword)
    const nameMatch = device.name && device.name.toLowerCase().includes(keyword)
    return ipMatch || machineNumMatch || nameMatch
  })
})

// ============================================
// Coordinate Mapping Functions
// ============================================

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

// ============================================
// Utility Functions
// ============================================

/**
 * 获取状态对应的Element Plus标签类型
 * @param {string} status - 设备状态
 * @returns {string} Element Plus标签类型
 */
const getStatusType = (status) => {
  const typeMap = {
    ONLINE: 'success',
    OFFLINE: 'info',
    PRINTING: 'primary',
    ERROR: 'danger'
  }
  return typeMap[status] || 'info'
}

/**
 * 获取状态显示标签
 * @param {string} status - 设备状态
 * @returns {string} 状态中文标签
 */
const getStatusLabel = (status) => {
  return STATUS_MAP[status]?.label || status
}

/**
 * 格式化坐标显示
 * @param {number} row - 行号
 * @param {number} col - 列号
 * @returns {string} 格式化后的坐标字符串
 */
const formatCoordinate = (row, col) => {
  const rowLabel = String.fromCharCode(64 + row)
  return `${rowLabel}-${col.toString().padStart(2, '0')}`
}

// ============================================
// Bind Device - 绑定设备功能
// ============================================

/**
 * 处理空槽位点击事件 - 打开绑定设备弹窗
 * @param {number} rowIndex - 行索引（0-based）
 * @param {number} colIndex - 列索引（0-based）
 */
const handleEmptySlotClick = (rowIndex, colIndex) => {
  // 记录目标槽位物理坐标
  targetSlot.value = {
    row: rowIndex + 1,
    col: getPhysicalColByIndex(colIndex)
  }
  selectedDeviceId.value = null
  bindDialogVisible.value = true

  // 获取未分配设备列表
  fetchUnallocatedDevices()
}

/**
 * 获取未分配位置的设备列表
 */
const fetchUnallocatedDevices = async () => {
  unallocatedLoading.value = true
  try {
    const res = await getUnallocatedPrinters()
    unallocatedList.value = res.data || []
  } catch (error) {
    console.error('获取未分配设备失败:', error)
    ElMessage.error('获取未分配设备列表失败')
    unallocatedList.value = []
  } finally {
    unallocatedLoading.value = false
  }
}

/**
 * 处理搜索输入
 */
const handleSearch = () => {
  // 搜索逻辑由 computed 属性 filteredUnallocatedList 自动处理
  // 清空选中项，避免过滤后选中的设备不在列表中
  selectedDeviceId.value = null
}

/**
 * 处理表格行点击 - 直接确认绑定
 * @param {Object} row - 点击的行数据
 */
const handleRowClick = (row) => {
  if (!row) return

  // 弹出确认对话框
  ElMessageBox.confirm(
    `确定要将设备 "${row.name}" 绑定到 ${targetSlotLabel.value} 吗？`,
    '确认绑定',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    // 用户确认，执行绑定
    performBind(row.id, targetSlotLabel.value)
  }).catch(() => {
    // 用户取消，不做任何操作
  })
}

/**
 * 执行设备绑定
 * @param {number} deviceId - 设备ID
 * @param {string} slotLabel - 槽位标签（如 A-01）
 */
const performBind = async (deviceId, slotLabel) => {
  bindLoading.value = true
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
      machineNumber: slotLabel
    })

    ElMessage.success('设备绑定成功')
    bindDialogVisible.value = false

    // 刷新看板数据
    await fetchDeviceData()
  } catch (error) {
    console.error('绑定设备失败:', error)
    ElMessage.error('绑定设备失败，请重试')
  } finally {
    bindLoading.value = false
  }
}

// ============================================
// Remove Device - 移除设备功能
// ============================================

/**
 * 从看板移除设备（解绑）
 * @param {Object} device - 要移除的设备对象
 */
const handleRemove = async (device) => {
  try {
    // 构建请求参数 - gridRow 和 gridCol 传 null 表示解绑
    const payload = [{
      id: device.id,
      gridRow: null,
      gridCol: null
    }]

    await batchUpdatePositions(payload)

    ElMessage.success(`设备 ${device.machine_number} 已从看板移除`)

    // 刷新看板数据
    await fetchDeviceData()
  } catch (error) {
    console.error('移除设备失败:', error)
    ElMessage.error('移除设备失败，请重试')
  }
}

// ============================================
// Drag and Drop Handlers
// ============================================

/**
 * 处理拖拽开始事件
 * @param {Object} device - 被拖拽的设备对象
 * @param {number} rowIndex - 起始行索引
 * @param {number} colIndex - 起始列索引
 */
const handleDragStart = (device, rowIndex, colIndex) => {
  draggedDevice.value = device
  draggedFrom.value = { row: rowIndex, col: colIndex }
}

/**
 * 处理拖拽进入事件
 * @param {number} rowIndex - 目标行索引
 * @param {number} colIndex - 目标列索引
 */
const handleDragEnter = (rowIndex, colIndex) => {
  // 不能放置到过道
  if (colIndex === GRID_CONFIG.AISLE_COL_INDEX) return
  dragOverCell.value = { row: rowIndex, col: colIndex }
}

/**
 * 处理拖拽离开事件
 */
const handleDragLeave = () => {
  dragOverCell.value = null
}

/**
 * 处理拖拽结束事件
 */
const handleDragEnd = () => {
  draggedDevice.value = null
  draggedFrom.value = null
  dragOverCell.value = null
}

/**
 * 处理放置事件
 * @param {number} targetRowIndex - 目标行索引
 * @param {number} targetColIndex - 目标列索引
 */
const handleDrop = async (targetRowIndex, targetColIndex) => {
  // 防止放置到过道
  if (targetColIndex === GRID_CONFIG.AISLE_COL_INDEX) return

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

/**
 * 移动设备到空位置
 * @param {Object} device - 要移动的设备
 * @param {Object} from - 原位置 {row, col}
 * @param {Object} to - 新位置 {row, col}
 */
const moveDeviceToEmptySlot = async (device, from, to) => {
  // 使用批量更新API
  const payload = [{
    id: device.id,
    gridRow: to.row,
    gridCol: to.col
  }]

  await batchUpdatePositions(payload)

  // 刷新数据
  await fetchDeviceData()
}

/**
 * 交换两台设备的位置
 * @param {Object} device1 - 第一台设备
 * @param {Object} pos1 - 第一台设备原位置 {row, col}
 * @param {Object} device2 - 第二台设备
 * @param {Object} pos2 - 第二台设备原位置 {row, col}
 */
const swapDevicesPosition = async (device1, pos1, device2, pos2) => {
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

  // 刷新数据
  await fetchDeviceData()
}

// ============================================
// Event Handlers
// ============================================

/**
 * 处理刷新按钮点击
 */
const handleRefresh = () => {
  fetchDeviceData()
  ElMessage.success('状态已刷新')
}

/**
 * 查看设备详情
 * @param {Object} device - 设备对象
 */
const handleDetail = (device) => {
  ElMessage.info(`查看设备详情: ${device.machine_number}`)
  console.log('Device detail:', device)
}

/**
 * 开始打印任务
 * @param {Object} device - 设备对象
 */
const handleStart = (device) => {
  ElMessage.success(`启动设备: ${device.machine_number}`)
  console.log('Start device:', device)
}

/**
 * 暂停打印任务
 * @param {Object} device - 设备对象
 */
const handlePause = (device) => {
  ElMessage.warning(`暂停设备: ${device.machine_number}`)
  console.log('Pause device:', device)
}

// ============================================
// Data Fetching
// ============================================

/**
 * 获取设备数据
 */
const fetchDeviceData = async () => {
  loading.value = true
  try {
    const response = await getPrinterList({ pageSize: 1000 })
    // 只保留有坐标的设备（在看板上显示的）- 后端使用驼峰命名 gridRow/gridCol
    rawDeviceList.value = (response.data.records || []).filter(d => d.gridRow && d.gridCol)
  } catch (error) {
    console.error('获取设备数据失败:', error)
    ElMessage.error('获取设备数据失败')
    // 使用模拟数据作为降级
    rawDeviceList.value = generateMockData()
  } finally {
    loading.value = false
  }
}

/**
 * 生成模拟设备数据（用于开发测试）
 * @returns {Array<Object>} 模拟设备数组
 */
const generateMockData = () => {
  const devices = []
  const statuses = ['ONLINE', 'OFFLINE', 'PRINTING', 'ERROR']
  const materials = ['PLA', 'ABS', 'PETG', 'TPU', 'ASA', null]
  const nozzleSizes = ['0.4mm', '0.6mm', '0.8mm']

  // 随机填充约70%的位置
  for (let row = 1; row <= GRID_CONFIG.ROWS; row++) {
    for (let col = 1; col <= GRID_CONFIG.COLS; col++) {
      if (Math.random() > 0.3) {
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const rowLabel = String.fromCharCode(64 + row)

        devices.push({
          id: `printer_${row}_${col}`,
          name: `打印机 ${rowLabel}-${col}`,
          ip_address: `192.168.1.${100 + row * 12 + col}`,
          mac_address: `AA:BB:CC:DD:${row.toString(16).padStart(2, '0')}:${col.toString(16).padStart(2, '0')}`,
          firmware_type: Math.random() > 0.5 ? 'Klipper' : 'Marlin',
          status: status,
          current_job_id: status === 'PRINTING' ? Math.floor(Math.random() * 10000) : null,
          current_material: materials[Math.floor(Math.random() * materials.length)],
          nozzle_size: nozzleSizes[Math.floor(Math.random() * nozzleSizes.length)],
          grid_row: row,
          grid_col: col,
          machine_number: `#${rowLabel}-${col.toString().padStart(2, '0')}`
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
   Dashboard Header
   ============================================ */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--ep-space-4) var(--ep-space-5);
  background: var(--ep-color-white);
  border-radius: var(--ep-border-radius-medium);
  box-shadow: var(--ep-box-shadow-light);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--ep-space-6);
}

.dashboard-title {
  display: flex;
  align-items: center;
  gap: var(--ep-space-2);
  margin: 0;
  font-size: var(--ep-font-size-large);
  font-weight: var(--ep-font-weight-semibold);
  color: var(--ep-text-color-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

.stats-bar {
  display: flex;
  gap: var(--ep-space-2);
  flex-wrap: nowrap;
}

.stats-bar .el-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1;
}

.stats-bar .el-tag :deep(.el-icon) {
  display: inline-flex;
  vertical-align: middle;
  margin-right: 2px;
}

.stats-bar .el-tag :deep(span) {
  display: inline;
  vertical-align: middle;
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
   Empty Slot - 空槽位
   ============================================ */
.empty-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  border: 1px dashed var(--ep-border-color-base);
  border-radius: var(--ep-border-radius-base);
  background: transparent;
  gap: var(--ep-space-1);
  color: var(--ep-text-color-placeholder);
  transition: all var(--ep-transition-duration) var(--ep-transition-timing);
  cursor: pointer;
}

.empty-slot:hover {
  border-color: var(--ep-color-primary-light-1);
  background: var(--ep-color-primary-light-6);
}

.empty-slot.drag-over {
  border-color: var(--ep-color-primary);
  background: var(--ep-color-primary-light-5);
  transform: scale(1.02);
}

.empty-slot .el-icon {
  opacity: 0.5;
}

.slot-text {
  font-size: var(--ep-font-size-extra-small);
  color: var(--ep-text-color-placeholder);
}

.slot-coord {
  font-size: 10px;
  color: var(--ep-text-color-placeholder);
  font-family: 'Courier New', monospace;
}

/* ============================================
   Device Card - 设备卡片
   ============================================ */
.device-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: var(--ep-border-radius-base);
  transition: all var(--ep-transition-duration) var(--ep-transition-timing);
  cursor: grab;
  user-select: none;
}

.device-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--ep-box-shadow-medium);
}

.device-card.dragging {
  opacity: 0.5;
  cursor: grabbing;
  transform: rotate(3deg);
}

.device-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--ep-space-3);
  gap: var(--ep-space-2);
}

/* 状态样式 */
.device-card.status-online {
  border-top: 3px solid var(--ep-color-success);
}

.device-card.status-offline {
  border-top: 3px solid var(--ep-color-info);
  opacity: 0.8;
}

.device-card.status-printing {
  border-top: 3px solid var(--ep-color-primary);
}

.device-card.status-error {
  border-top: 3px solid var(--ep-color-danger);
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.machine-number {
  font-family: 'Courier New', monospace;
  font-size: var(--ep-font-size-small);
  font-weight: var(--ep-font-weight-bold);
  color: var(--ep-text-color-primary);
}

.status-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.online {
  background-color: var(--ep-color-success);
  box-shadow: 0 0 6px var(--ep-color-success);
}

.status-dot.offline {
  background-color: var(--ep-color-info);
}

.status-dot.printing {
  background-color: var(--ep-color-primary);
  box-shadow: 0 0 6px var(--ep-color-primary);
  animation: pulse 2s infinite;
}

.status-dot.error {
  background-color: var(--ep-color-danger);
  box-shadow: 0 0 6px var(--ep-color-danger);
  animation: blink 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* 卡片内容区 */
.card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  overflow: hidden;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--ep-text-color-secondary);
}

.info-row .el-icon {
  flex-shrink: 0;
  color: var(--ep-color-primary-light-1);
}

.info-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.job-info {
  color: var(--ep-color-primary);
  font-weight: var(--ep-font-weight-medium);
}

/* 底部操作区 */
.card-actions {
  margin-top: auto;
  padding-top: var(--ep-space-2);
  border-top: 1px solid var(--ep-border-color-lighter);
}

.card-actions :deep(.el-button) {
  padding: 4px 8px;
}

/* ============================================
   Dialog Styles - 弹窗样式
   ============================================ */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--ep-space-3);
}

/* 搜索框样式 */
.search-bar {
  margin-bottom: var(--ep-space-4);
}

.search-bar .el-input {
  width: 100%;
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
  .dashboard-header {
    flex-direction: column;
    gap: var(--ep-space-3);
    align-items: flex-start;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ep-space-3);
  }

  .stats-bar {
    flex-wrap: wrap;
  }
}
</style>
