export const ACTIVE_JOB_STATUSES = Object.freeze([
  'ASSIGNED',
  'UPLOADING',
  'READY',
  'PRINTING',
  'PAUSED',
  'RECONCILING'
])

export const isActiveJob = job => ACTIVE_JOB_STATUSES.includes(job?.status)

export const selectActiveJobs = jobs => (
  (Array.isArray(jobs) ? jobs : []).filter(isActiveJob)
)
