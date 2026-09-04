export const PRESIGNED_URL_RETRY_STATUSES = Object.freeze([401, 403, 410])

/** 预签名地址失效时只允许重新签发一次。 */
export const shouldRefreshPresignedUrl = (status, hasRetried) => (
  !hasRetried && PRESIGNED_URL_RETRY_STATUSES.includes(Number(status))
)
