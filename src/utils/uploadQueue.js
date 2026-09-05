export const UPLOAD_QUEUE_CONCURRENCY = 3

export function chunkItems(items, chunkSize) {
  const chunks = []
  const size = Math.max(1, Number(chunkSize) || 1)
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function createAbortError() {
  const error = new Error('上传已取消')
  error.name = 'AbortError'
  return error
}

export async function runUploadQueue(items, worker, options = {}) {
  const queue = Array.isArray(items) ? items : []
  const concurrency = Math.max(1, Math.min(Number(options.concurrency) || UPLOAD_QUEUE_CONCURRENCY, queue.length || 1))
  const signal = options.signal
  const results = Array.from({ length: queue.length })
  let nextIndex = 0

  const takeNext = () => {
    if (signal?.aborted) throw createAbortError()
    const index = nextIndex
    nextIndex += 1
    return index < queue.length ? index : -1
  }

  const consume = async () => {
    while (true) {
      const index = takeNext()
      if (index < 0) return
      try {
        results[index] = { status: 'fulfilled', value: await worker(queue[index], index) }
      } catch (error) {
        if (signal?.aborted) throw error
        results[index] = { status: 'rejected', reason: error }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, consume))
  return results
}
