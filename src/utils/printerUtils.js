/**
 * 打印机数据格式化工具函数
 * @module utils/printerUtils
 */

/**
 * 格式化温度为整数（如 15°C）
 * @param {number|null|undefined} temp - 温度值
 * @returns {string} 格式化后的温度字符串
 */
export function formatTemperature(temp) {
  if (temp === null || temp === undefined || isNaN(temp)) {
    return '--'
  }
  return Math.round(Number(temp)) + '°C'
}

/**
 * 将秒数转换为 HH:mm:ss 格式
 * @param {number|null|undefined} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return '00:00:00'
  }

  const totalSeconds = Math.floor(Number(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':')
}

/**
 * 将毫米转换为米（保留两位小数）
 * @param {number|null|undefined} mm - 毫米数
 * @returns {string} 格式化后的米数字符串
 */
export function formatFilamentUsed(mm) {
  if (mm === null || mm === undefined || isNaN(mm) || mm < 0) {
    return '0.00m'
  }
  const meters = Number(mm) / 1000
  return meters.toFixed(2) + 'm'
}

/**
 * 格式化进度百分比
 * @param {number|null|undefined} progress - 进度值（0-100）
 * @returns {string} 格式化后的进度字符串
 */
export function formatProgress(progress) {
  if (progress === null || progress === undefined || isNaN(progress)) {
    return '0.0'
  }
  return Number(progress).toFixed(1)
}
