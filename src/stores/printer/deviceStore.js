import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getPrinterList, batchUpdatePositions, updatePrinter } from '@/api/printer'
import { GRID_CONFIG } from '@/utils/constants'

/**
 * 设备数据管理 Store
 * @description 负责打印机设备的基础数据管理（CRUD、位置更新）
 */
export const useDeviceStore = defineStore('device', () => {
  // ============================================
  // State
  // ============================================

  /** 原始设备数据列表 */
  const rawDeviceList = ref([])

  /** 加载状态 */
  const loading = ref(false)

  /** 数据版本号 */
  const version = ref(0)

  // ============================================
  // Getters (Computed)
  // ============================================

  /**
   * 设备 ID 映射表，用于快速查找 O(1)
   */
  const deviceById = computed(() => {
    const map = new Map()
    rawDeviceList.value.forEach(device => {
      map.set(String(device.id), device)
    })
    return map
  })

  /**
   * 设备总数
   */
  const totalDevices = computed(() => rawDeviceList.value.length)

  /**
   * 将扁平设备数组转换为4行13列的二维矩阵（包含过道列）
   * 直接依赖 rawDeviceList.value，确保数据更新后自动重新计算
   */
  const deviceMatrix = computed(() => {
    console.log('[DeviceStore] deviceMatrix 计算开始, rawDeviceList.length:', rawDeviceList.value.length)

    // 使用 Map 优化查找性能 O(n) -> O(1)
    const deviceMap = new Map()
    rawDeviceList.value.forEach(device => {
      const key = `${device.gridRow},${device.gridCol}`
      deviceMap.set(key, device)
    })

    const matrix = []
    let totalDevicesInMatrix = 0
    for (let row = 1; row <= GRID_CONFIG.ROWS; row++) {
      const rowData = []
      for (let col = 1; col <= GRID_CONFIG.TOTAL_COLS; col++) {
        // 过道位置
        if (col === GRID_CONFIG.AISLE_COL) {
          rowData.push('aisle')
          continue
        }

        // 计算物理列号（排除过道）
        const physicalCol = col < GRID_CONFIG.AISLE_COL ? col : col - 1

        // 使用 Map 查找设备 O(1)
        const key = `${row},${physicalCol}`
        const device = deviceMap.get(key)
        if (device) {
          totalDevicesInMatrix++
        }
        rowData.push(device || null)
      }
      matrix.push(rowData)
    }

    console.log('[DeviceStore] deviceMatrix 计算完成:', matrix.length, '行 x', matrix[0]?.length, '列, 设备总数:', totalDevicesInMatrix)
    return matrix
  })

  // ============================================
  // Actions
  // ============================================

  /**
   * 获取设备数据
   * @description 从 API 获取打印机列表，并过滤掉无效坐标的设备
   */
  async function fetchDeviceData() {
    loading.value = true
    console.log('[DeviceStore] fetchDeviceData 开始调用')
    try {
      const response = await getPrinterList({ pageSize: 1000 })
      console.log('[DeviceStore] API 响应:', response)
      const records = response.data?.records || []
      console.log('[DeviceStore] 原始 records:', records.length, records)

      // 只保留有有效坐标的设备
      const filtered = records.filter(d => {
        const hasValidRow = typeof d.gridRow === 'number' && d.gridRow > 0
        const hasValidCol = typeof d.gridCol === 'number' && d.gridCol > 0
        console.log(`[DeviceStore] 设备 ${d.id}: gridRow=${d.gridRow}, gridCol=${d.gridCol}, valid=${hasValidRow && hasValidCol}`)
        return hasValidRow && hasValidCol
      })

      console.log('[DeviceStore] 过滤后设备数:', filtered.length)
      // 直接赋值，触发 rawDeviceList 的响应式更新，deviceMatrix computed 会自动重新计算
      rawDeviceList.value = filtered
      version.value++
      console.log('[DeviceStore] version 更新为:', version.value)
    } catch (error) {
      console.error('[DeviceStore] 获取设备数据失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 批量更新设备位置
   */
  async function updatePositions(payload) {
    await batchUpdatePositions(payload)
    await fetchDeviceData()
  }

  /**
   * 更新单个打印机信息
   */
  async function updateDevice(data) {
    await updatePrinter(data)
    await fetchDeviceData()
  }

  /**
   * 从看板移除设备（设置 gridRow/gridCol 为 null）
   */
  async function removeDeviceFromBoard(deviceId) {
    const payload = [{
      id: deviceId,
      gridRow: null,
      gridCol: null
    }]
    await updatePositions(payload)
  }

  /**
   * 根据 ID 获取设备
   */
  function getDeviceById(deviceId) {
    return deviceById.value.get(String(deviceId))
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    rawDeviceList,
    loading,
    version,

    // Getters
    deviceById,
    totalDevices,
    deviceMatrix,

    // Actions
    fetchDeviceData,
    updatePositions,
    updateDevice,
    removeDeviceFromBoard,
    getDeviceById
  }
})