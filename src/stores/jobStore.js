import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getJobDetail, getJobPage, getJobQueue } from '@/api/job'
import { ACTIVE_JOB_STATUSES, isActiveJob, selectActiveJobs } from '@/utils/jobSelectors'

const scheduleMicrotask = typeof queueMicrotask === 'function'
  ? queueMicrotask
  : callback => Promise.resolve().then(callback)
const MAX_JOB_DETAIL_CACHE_SIZE = 100

const sortByUpdatedAt = (left, right) => (
  new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0)
)

export const useJobStore = defineStore('job', () => {
  const queueJobs = ref([])
  const activeJobs = ref([])
  const jobDetails = ref(new Map())
  const queueLoading = ref(false)
  const activeLoading = ref(false)
  const detailLoading = ref(false)
  const queueError = ref(null)
  const activeError = ref(null)
  const detailError = ref(null)
  const activePage = ref(1)
  const activePageSize = ref(10)
  const pendingRealtimeStatuses = new Map()
  let realtimeFlushScheduled = false

  function cacheJobDetail(id, detail) {
    const key = String(id)
    const nextDetails = new Map(jobDetails.value)
    nextDetails.delete(key)
    nextDetails.set(key, detail)
    while (nextDetails.size > MAX_JOB_DETAIL_CACHE_SIZE) {
      nextDetails.delete(nextDetails.keys().next().value)
    }
    jobDetails.value = nextDetails
  }

  const activeTotal = computed(() => activeJobs.value.length)
  const activePageJobs = computed(() => {
    const start = (activePage.value - 1) * activePageSize.value
    return activeJobs.value.slice(start, start + activePageSize.value)
  })

  async function fetchQueue() {
    queueLoading.value = true
    queueError.value = null
    try {
      const response = await getJobQueue()
      queueJobs.value = (response.data || []).filter(job => job.status === 'QUEUED')
      return queueJobs.value
    } catch (error) {
      queueError.value = error
      throw error
    } finally {
      queueLoading.value = false
    }
  }

  async function fetchActive() {
    activeLoading.value = true
    activeError.value = null
    try {
      const responses = await Promise.all(
        ACTIVE_JOB_STATUSES.map(status => getJobPage({
          pageNum: 1,
          pageSize: 100,
          status
        }))
      )
      const jobsById = new Map()
      responses.forEach(response => {
        const records = response.data?.records || []
        records.forEach(job => jobsById.set(String(job.id), job))
      })
      activeJobs.value = selectActiveJobs([...jobsById.values()]).sort(sortByUpdatedAt)
      if (activePage.value > Math.max(1, Math.ceil(activeJobs.value.length / activePageSize.value))) {
        activePage.value = 1
      }
      return activeJobs.value
    } catch (error) {
      activeError.value = error
      throw error
    } finally {
      activeLoading.value = false
    }
  }

  async function fetchJobDetail(id) {
    detailLoading.value = true
    detailError.value = null
    try {
      const response = await getJobDetail(id)
      const detail = response.data
      cacheJobDetail(id, detail)
      return detail
    } catch (error) {
      detailError.value = error
      throw error
    } finally {
      detailLoading.value = false
    }
  }

  function normalizeRealtimeJobStatus(message = {}) {
    const data = message.data || {}
    const id = data.jobId ?? message.jobId
    const status = String(data.status || data.currentJobStatus || '').toUpperCase()
    if (id === undefined || id === null || !status) return null
    return { data, id, status, key: String(id), message }
  }

  function applyRealtimeJobStatuses(messages = []) {
    const jobsById = new Map(activeJobs.value.map(job => [String(job.id), job]))
    const details = new Map(jobDetails.value)
    const updatedJobs = []

    messages.forEach(message => {
      const normalized = normalizeRealtimeJobStatus(message)
      if (!normalized) return

      const { data, id, status, key } = normalized
      const existing = jobsById.get(key) || details.get(key) || {}
      const updated = { ...existing, id, status }
      if (data.progress !== undefined) updated.progress = data.progress
      if (data.printerId !== undefined) updated.printerId = data.printerId
      if (data.errorReason !== undefined) updated.errorReason = data.errorReason
      if (data.completedAt !== undefined) updated.completedAt = data.completedAt
      if (data.updatedAt !== undefined) updated.updatedAt = data.updatedAt
      if (message.timestamp !== undefined && updated.updatedAt === undefined) updated.updatedAt = message.timestamp

      if (isActiveJob(updated)) jobsById.set(key, updated)
      else jobsById.delete(key)
      if (details.has(key)) details.set(key, updated)
      updatedJobs.push(updated)
    })

    if (!updatedJobs.length) return []
    activeJobs.value = selectActiveJobs([...jobsById.values()]).sort(sortByUpdatedAt)
    if (updatedJobs.some(job => details.has(String(job.id)))) jobDetails.value = details
    return updatedJobs
  }

  function applyRealtimeJobStatus(message = {}) {
    return applyRealtimeJobStatuses([message])[0] || null
  }

  function flushRealtimeJobStatuses() {
    if (!pendingRealtimeStatuses.size) return []
    const messages = [...pendingRealtimeStatuses.values()]
    pendingRealtimeStatuses.clear()
    realtimeFlushScheduled = false
    return applyRealtimeJobStatuses(messages)
  }

  function queueRealtimeJobStatus(message = {}) {
    const normalized = normalizeRealtimeJobStatus(message)
    if (!normalized) return false

    const previous = pendingRealtimeStatuses.get(normalized.key)
    pendingRealtimeStatuses.set(normalized.key, previous
      ? { ...previous, ...message, data: { ...previous.data, ...message.data } }
      : message)
    if (!realtimeFlushScheduled) {
      realtimeFlushScheduled = true
      scheduleMicrotask(flushRealtimeJobStatuses)
    }
    return true
  }

  function clearQueuedRealtimeStatuses() {
    pendingRealtimeStatuses.clear()
    realtimeFlushScheduled = false
  }

  function applyBatchConfirmResults(result = {}) {
    const jobs = (result.items || [])
      .map(item => item.job)
      .filter(Boolean)
    if (!jobs.length) return []

    const jobsById = new Map(activeJobs.value.map(job => [String(job.id), job]))
    jobs.forEach(job => jobsById.set(String(job.id), job))
    activeJobs.value = selectActiveJobs([...jobsById.values()]).sort(sortByUpdatedAt)
    const details = new Map(jobDetails.value)
    jobs.forEach(job => details.set(String(job.id), job))
    jobDetails.value = details
    return jobs
  }

  async function refresh() {
    const results = await Promise.allSettled([fetchQueue(), fetchActive()])
    const rejected = results.find(result => result.status === 'rejected')
    if (rejected) throw rejected.reason
    return { queue: queueJobs.value, active: activeJobs.value }
  }

  return {
    queueJobs,
    activeJobs,
    jobDetails,
    queueLoading,
    activeLoading,
    detailLoading,
    queueError,
    activeError,
    detailError,
    activePage,
    activePageSize,
    activeTotal,
    activePageJobs,
    fetchQueue,
    fetchActive,
    fetchJobDetail,
    applyRealtimeJobStatus,
    applyRealtimeJobStatuses,
    queueRealtimeJobStatus,
    flushRealtimeJobStatuses,
    clearQueuedRealtimeStatuses,
    applyBatchConfirmResults,
    refresh
  }
})
