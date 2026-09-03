/**
 * 判断 WebSocket 事件序号是否可以应用。
 * 没有 sequence 的旧消息保持兼容；重复或乱序消息会被丢弃。
 */
export function acceptRealtimeSequence(lastSequence, rawSequence) {
  const sequence = Number(rawSequence)
  if (!Number.isInteger(sequence) || sequence < 0) {
    return { accepted: true, gap: false, nextSequence: lastSequence }
  }
  if (lastSequence === null || lastSequence === undefined) {
    return { accepted: true, gap: false, nextSequence: sequence }
  }
  if (sequence <= lastSequence) {
    return { accepted: false, gap: false, nextSequence: lastSequence }
  }
  return {
    accepted: true,
    gap: sequence > lastSequence + 1,
    nextSequence: sequence
  }
}
