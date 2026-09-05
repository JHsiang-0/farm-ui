export function countBy(items, selector = item => item) {
  const counts = Object.create(null)
  for (const item of Array.isArray(items) ? items : []) {
    const key = selector(item)
    if (key !== undefined && key !== null) counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

export function capMapSize(map, maxSize) {
  const capped = new Map(map instanceof Map ? map : [])
  while (capped.size > maxSize) capped.delete(capped.keys().next().value)
  return capped
}
