const STORAGE_KEY = 'fabmatrix.server.connection'

const envApiBaseUrl = import.meta.env?.VITE_API_BASE_URL || ''
const envWsUrl = import.meta.env?.VITE_WS_URL || ''

const trimTrailingSlash = value => String(value || '').trim().replace(/\/+$/, '')

export const normalizeServerUrl = value => {
  const url = trimTrailingSlash(value)
  if (!url) return ''

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    if (parsed.username || parsed.password) return ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

const readStoredConfig = () => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw)
    const apiBaseUrl = normalizeServerUrl(value?.apiBaseUrl)
    const wsUrl = String(value?.wsUrl || '').trim()
    return apiBaseUrl || wsUrl ? { apiBaseUrl, wsUrl } : null
  } catch {
    return null
  }
}

export const getServerConfig = () => {
  const stored = readStoredConfig()
  const hasStoredConfig = Boolean(stored)
  return {
    apiBaseUrl: hasStoredConfig ? stored.apiBaseUrl : normalizeServerUrl(envApiBaseUrl),
    wsUrl: hasStoredConfig ? stored.wsUrl : envWsUrl
  }
}

export const getEnvironmentServerConfig = () => ({
  apiBaseUrl: normalizeServerUrl(envApiBaseUrl),
  wsUrl: envWsUrl
})

export const parseServerEndpoint = value => {
  const normalized = normalizeServerUrl(value)
  if (!normalized) return { protocol: 'http', host: '', port: '' }

  const parsed = new URL(normalized)
  return {
    protocol: parsed.protocol === 'https:' ? 'https' : 'http',
    host: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80')
  }
}

export const buildServerBaseUrl = ({ protocol = 'http', host, port }) => {
  const normalizedProtocol = protocol === 'https' ? 'https' : 'http'
  const normalizedHost = String(host || '').trim()
  const normalizedPort = String(port || '').trim()
  if (!normalizedHost || !/^\d{1,5}$/.test(normalizedPort) || Number(normalizedPort) < 1 || Number(normalizedPort) > 65535) return ''

  const hostWithBrackets = normalizedHost.includes(':') && !normalizedHost.startsWith('[')
    ? `[${normalizedHost}]`
    : normalizedHost
  return normalizeServerUrl(`${normalizedProtocol}://${hostWithBrackets}:${normalizedPort}`)
}

export const getApiBaseUrl = () => getServerConfig().apiBaseUrl

export const getWebSocketBaseUrl = () => {
  const { wsUrl, apiBaseUrl } = getServerConfig()
  if (wsUrl) return wsUrl
  if (apiBaseUrl) {
    try {
      const parsed = new URL(apiBaseUrl)
      parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
      parsed.pathname = '/ws/farm-status'
      parsed.search = ''
      return parsed.toString().replace(/\/$/, '')
    } catch {
      return ''
    }
  }

  if (typeof window !== 'undefined' && ['http:', 'https:'].includes(window.location.protocol)) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws/farm-status`
  }

  return ''
}

export const saveServerConfig = ({ apiBaseUrl, wsUrl = '' }) => {
  const normalizedApiBaseUrl = normalizeServerUrl(apiBaseUrl)
  if (!normalizedApiBaseUrl) throw new Error('请输入有效的 HTTP/HTTPS 服务器地址')

  const normalizedWsUrl = String(wsUrl || '').trim()
  if (normalizedWsUrl && !/^wss?:\/\//i.test(normalizedWsUrl)) {
    throw new Error('WebSocket 地址必须以 ws:// 或 wss:// 开头')
  }

  const config = { apiBaseUrl: normalizedApiBaseUrl, wsUrl: normalizedWsUrl }
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  return config
}

export const clearServerConfig = () => {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY)
}

export const getServerConfigStorageKey = () => STORAGE_KEY
