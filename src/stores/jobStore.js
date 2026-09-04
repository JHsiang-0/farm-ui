import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getJobDetail, getJobPage, getJobQueue } from '@/api/job'
import { ACTIVE_JOB_STATUSES, isActiveJob, selectActiveJobs } from '@/utils/jobSelectors'

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
      queueJobs.value = []
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
      activeJobs.value = []
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
      jobDetails.value = new Map(jobDetails.value).set(String(id), detail)
      return detail
    } catch (error) {
      detailError.value = error
      throw error
    } finally {
      detailLoading.value = false
    }
  }

  function applyRealtimeJobStatus(message = {}) {
    const data = message.data || {}
    const id = data.jobId ?? message.jobId
    const status = String(data.status || data.currentJobStatus || '').toUpperCase()
    if (id === undefined || id === null || !status) return null

    const key = String(id)
    const existing = activeJobs.value.find(job => String(job.id) === key)
      || jobDetails.value.get(key)
      || {}
    const updated = { ...existing, id, status }
    if (data.progress !== undefined) updated.progress = data.progress
    if (data.printerId !== undefined) updated.printerId = data.printerId
    if (data.errorReason !== undefined) updated.errorReason = data.errorReason
    if (data.completedAt !== undefined) updated.completedAt = data.completedAt
    if (data.updatedAt !== undefined) updated.updatedAt = data.updatedAt
    if (message.timestamp !== undefined && updated.updatedAt === undefined) updated.updatedAt = message.timestamp

    const remaining = activeJobs.value.filter(job => String(job.id) !== key)
    activeJobs.value = isActiveJob(updated)
      ? selectActiveJobs([...remaining, updated]).sort(sortByUpdatedAt)
      : remaining
    if (jobDetails.value.has(key)) {
      jobDetails.value = new Map(jobDetails.value).set(key, updated)
    }
    return updated
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
    refresh
  }
})
