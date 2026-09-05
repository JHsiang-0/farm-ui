import { JOB_STATUS_MAP, PRINTER_STATUS_MAP } from './constants.js'
import { normalizeJobStatus, normalizePrinterStatus } from './dataAdapters.js'
import {
  CheckCircleFilledIcon,
  ErrorCircleFilledIcon,
  HelpCircleFilledIcon,
  LoadingIcon,
  PauseIcon,
  PlayIcon
} from 'tdesign-icons-vue-next'

const STATUS_CONFIG = Object.freeze({
  printer: {
    map: PRINTER_STATUS_MAP,
    normalize: normalizePrinterStatus,
    icons: {
      OFFLINE: HelpCircleFilledIcon,
      IDLE: CheckCircleFilledIcon,
      PREPARING: LoadingIcon,
      PRINTING: PlayIcon,
      PAUSED: PauseIcon,
      ERROR: ErrorCircleFilledIcon,
      UNKNOWN: HelpCircleFilledIcon
    }
  },
  job: {
    map: JOB_STATUS_MAP,
    normalize: normalizeJobStatus,
    icons: {
      QUEUED: LoadingIcon,
      ASSIGNED: PlayIcon,
      UPLOADING: LoadingIcon,
      READY: CheckCircleFilledIcon,
      PRINTING: PlayIcon,
      PAUSED: PauseIcon,
      RECONCILING: LoadingIcon,
      COMPLETED: CheckCircleFilledIcon,
      FAILED: ErrorCircleFilledIcon,
      CANCELLED: HelpCircleFilledIcon
    }
  }
})

const FALLBACK_STATUS = Object.freeze({
  code: 'UNKNOWN',
  label: '未知状态',
  theme: 'default',
  description: '暂时无法确认当前状态',
  icon: HelpCircleFilledIcon
})

export function getStatusView(domain, value) {
  const config = STATUS_CONFIG[domain] || STATUS_CONFIG.job
  const code = config.normalize(value) || 'UNKNOWN'
  const source = config.map[code]

  if (!source) return { ...FALLBACK_STATUS, code }

  return {
    code,
    label: source.label,
    theme: source.type || 'default',
    description: source.description || `当前状态：${source.label}`,
    icon: config.icons[code] || HelpCircleFilledIcon
  }
}

