/**
 * 格式化工具函数
 * @module utils/formatters
 * @description 提供各种数据格式化函数，用于 UI 显示
 */

/**
 * 格式化温度
 * @param {number} temp - 温度值
 * @returns {string} 格式化后的温度字符串
 */
export function formatTemp(temp) {
  if (temp === undefined || temp === null) return '--°C'
  return `${Math.round(temp)}°C`
}

/**
 * 格式化时长
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时长字符串 (HH:MM:SS)
 */
export function formatDuration(seconds) {
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
export function formatFilament(mm) {
  if (!mm) return '0.00m'
  return `${(mm / 1000).toFixed(2)}m`
}

/**
 * 格式化行标签（数字转字母）
 * @param {number} row - 行号（1-based）
 * @returns {string} 行标签（如 A, B, C...）
 */
export function formatRowLabel(row) {
  return String.fromCharCode(65 + row - 1)
}

/**
 * 格式化槽位标签
 * @param {number} row - 行号
 * @param {number} col - 列号
 * @returns {string} 槽位标签（如 A-01）
 */
export function formatSlotLabel(row, col) {
  const rowLabel = formatRowLabel(row)
  return `${rowLabel}-${col.toString().padStart(2, '0')}`
}

/**
 * 格式化百分比
 * @param {number} value - 百分比值
 * @param {number} decimals - 小数位数，默认 0
 * @returns {string} 格式化后的百分比字符串
 */
export function formatPercent(value, decimals = 0) {
  if (value === undefined || value === null) return '--%'
  return `${value.toFixed(decimals)}%`
}

/**
 * 格式化日期时间
 * @param {Date|string|number} date - 日期对象或时间戳
 * @returns {string} 格式化后的时间字符串 (HH:MM:SS)
 */
export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const seconds = d.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}
