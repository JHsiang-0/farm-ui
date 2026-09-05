import { PRINTER_STATE } from './constants.js'

export const DASHBOARD_STATUS_ITEMS = Object.freeze([
  { key: PRINTER_STATE.PRINTING, label: '打印中', theme: 'primary' },
  { key: PRINTER_STATE.STANDBY, label: '待机', theme: 'success' },
  { key: PRINTER_STATE.PAUSED, label: '已暂停', theme: 'warning' },
  { key: PRINTER_STATE.FAULT, label: '硬件故障', theme: 'danger' },
  { key: PRINTER_STATE.SYS_ERROR, label: '系统错误', theme: 'danger' },
  { key: PRINTER_STATE.PRINT_ERROR, label: '打印错误', theme: 'warning' },
  { key: PRINTER_STATE.STARTING, label: '启动中', theme: 'warning' },
  { key: PRINTER_STATE.COMPLETED, label: '已完成', theme: 'success' },
  { key: PRINTER_STATE.CANCELLED, label: '已取消', theme: 'default' },
  { key: PRINTER_STATE.UNKNOWN, label: '离线/未知', theme: 'default' }
])

export function buildStatusSummary(statusCounts = {}) {
  const items = DASHBOARD_STATUS_ITEMS.map(item => ({
    ...item,
    count: Number.isFinite(Number(statusCounts[item.key])) ? Math.max(0, Number(statusCounts[item.key])) : 0
  }))
  const total = items.reduce((sum, item) => sum + item.count, 0)
  return {
    total,
    items: items.map(item => ({
      ...item,
      percent: total ? Math.round((item.count / total) * 100) : 0
    }))
  }
}

function dateKey(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

export function buildSevenDayJobTrend(jobs = [], referenceTime = new Date()) {
  const end = new Date(referenceTime)
  if (Number.isNaN(end.getTime())) return []
  end.setUTCHours(0, 0, 0, 0)
  const counts = new Map()
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(end)
    day.setUTCDate(end.getUTCDate() - 6 + index)
    const key = dateKey(day)
    counts.set(key, 0)
    return { key, label: key.slice(5) }
  })
  for (const job of Array.isArray(jobs) ? jobs : []) {
    const key = dateKey(job?.completedAt || job?.createdAt)
    if (counts.has(key)) counts.set(key, counts.get(key) + 1)
  }
  return days.map(day => ({ ...day, count: counts.get(day.key) }))
}
