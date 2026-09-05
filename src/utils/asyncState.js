export const ASYNC_STATES = Object.freeze({
  LOADING: 'loading',
  ERROR: 'error',
  EMPTY: 'empty',
  READY: 'ready'
})

export function getAsyncState({ loading = false, error = null, hasData = false } = {}) {
  if (loading) return ASYNC_STATES.LOADING
  if (error) return ASYNC_STATES.ERROR
  return hasData ? ASYNC_STATES.READY : ASYNC_STATES.EMPTY
}

export function getAsyncErrorMessage(error, fallback = '加载失败，请重试') {
  if (typeof error === 'string' && error.trim()) return error
  if (error?.message && String(error.message).trim()) return String(error.message)
  return fallback
}
