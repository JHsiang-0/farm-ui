export const REALTIME_PROTOCOL_VERSION = '1'

export const isSupportedRealtimeVersion = version => (
  version === undefined || version === null || String(version) === REALTIME_PROTOCOL_VERSION
)

export const rememberRealtimeEvent = (seenEventIds, eventId, maxSize = 1000) => {
  if (eventId === undefined || eventId === null || !String(eventId)) return false

  const eventKey = String(eventId)
  if (seenEventIds.has(eventKey)) return true

  seenEventIds.add(eventKey)
  if (seenEventIds.size > maxSize) {
    seenEventIds.delete(seenEventIds.values().next().value)
  }
  return false
}
