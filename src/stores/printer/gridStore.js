import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useRealtimeStore } from './realtimeStore'
import { PRINTER_STATE, GRID_CONFIG } from '@/utils/constants'

/**
 * 网格布局计算 Store
 * @description 负责网格布局常量和状态统计
 * @author Cline
 */
export const useGridStore = defineStore('grid', () => {
  // ============================================
  // 依赖其他 Store
  // ============================================

  const realtimeStore = useRealtimeStore()

  // ============================================
  // Getters (Computed)
  // ============================================

  /**
   * 各状态设备数量统计
   * 基于 WebSocket 实时状态统计
   * @returns {Object} 状态计数对象
   */
  const statusCounts = computed(() => {
    const counts = {
      [PRINTER_STATE.PRINTING]: 0,
      [PRINTER_STATE.STANDBY]: 0,
      [PRINTER_STATE.PAUSED]: 0,
      [PRINTER_STATE.COMPLETED]: 0,
      [PRINTER_STATE.FAULT]: 0,
      [PRINTER_STATE.SYS_ERROR]: 0,
      [PRINTER_STATE.PRINT_ERROR]: 0,
      [PRINTER_STATE.STARTING]: 0,
      [PRINTER_STATE.CANCELLED]: 0
    }

    // 从 statusMap 统计状态
    const statusMap = realtimeStore.statusMap
    statusMap.forEach((status) => {
      const state = status.state
      if (state && Object.prototype.hasOwnProperty.call(counts, state)) {
        counts[state]++
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
    return String.fromCharCode(65 + row - 1)
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

  // ============================================
  // Return
  // ============================================

  return {
    // Constants
    GRID_CONFIG,

    // Getters
    statusCounts,

    // Utilities
    formatRowLabel,
    getPhysicalCol,
    getPhysicalColByIndex,
    isAisleCell
  }
})
