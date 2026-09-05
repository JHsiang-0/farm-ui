import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getPrinterDetail, getPrinterList, batchUpdatePositions, updatePrinter } from '@/api/printer'
import { GRID_CONFIG } from '@/utils/constants'

const MAX_DETAIL_CACHE_SIZE = 100

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

  /** 按 ID 缓存后端返回的 PrinterVO 详情 */
  const detailsById = ref(new Map())

  /** 详情请求状态 */
  const detailLoading = ref(false)

  function cacheDeviceDetail(detail) {
    const key = String(detail.id)
    const nextDetails = new Map(detailsById.value)
    nextDetails.delete(key)
    nextDetails.set(key, detail)
    while (nextDetails.size > MAX_DETAIL_CACHE_SIZE) {
      nextDetails.delete(nextDetails.keys().next().value)
    }
    detailsById.value = nextDetails
  }

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
    // 使用 Map 优化查找性能 O(n) -> O(1)
    const deviceMap = new Map()
    rawDeviceList.value.forEach(device => {
      const key = `${device.gridRow},${device.gridCol}`
      deviceMap.set(key, device)
    })

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
        const physicalCol = col < GRID_CONFIG.AISLE_COL ? col : col - 1

        // 使用 Map 查找设备 O(1)
        const key = `${row},${physicalCol}`
        const device = deviceMap.get(key)
        rowData.push(device || null)
      }
      matrix.push(rowData)
    }

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
    try {
      const response = await getPrinterList({ pageSize: 100 })
      const records = response.data?.records || []

      // 只保留有有效坐标的设备
      const filtered = records.filter(d => {
        const hasValidRow = typeof d.gridRow === 'number' && d.gridRow > 0
        const hasValidCol = typeof d.gridCol === 'number' && d.gridCol > 0
        return hasValidRow && hasValidCol
      })

      // 直接赋值，触发 rawDeviceList 的响应式更新，deviceMatrix computed 会自动重新计算
      rawDeviceList.value = filtered
      version.value++
    } catch (error) {
      console.error('[DeviceStore] 获取设备数据失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取真实打印机详情并缓存，失败时不以列表行或伪造温度替代。
   */
  async function fetchDeviceDetail(deviceId) {
    detailLoading.value = true
    try {
      const response = await getPrinterDetail(deviceId)
      const detail = response?.data || null
      if (detail) {
        cacheDeviceDetail(detail)
      }
      return detail
    } finally {
      detailLoading.value = false
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
    detailsById,
    detailLoading,

    // Getters
    deviceById,
    totalDevices,
    deviceMatrix,

    // Actions
    fetchDeviceData,
    fetchDeviceDetail,
    updatePositions,
    updateDevice,
    removeDeviceFromBoard,
    getDeviceById
  }
})
