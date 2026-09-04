import { mockState } from './data'

const toState = status => ({
  unifiedState: status === 'IDLE' ? 'STANDBY' : status === 'ERROR' ? 'FAULT' : status === 'OFFLINE' ? 'UNKNOWN' : status,
  state: status
})

const buildPrinterData = printer => ({
  ...toState(printer.status),
  currentJobId: printer.currentJobId,
  currentJobFileName: printer.currentJobFileName,
  progress: printer.currentJobId ? 62 : 0,
  toolTemperature: printer.status === 'PRINTING' ? 210 : 25,
  toolTarget: printer.status === 'PRINTING' ? 210 : 0,
  bedTemperature: printer.status === 'PRINTING' ? 60 : 25,
  bedTarget: printer.status === 'PRINTING' ? 60 : 0
})

export function createMockWebSocketStream({ onOpen, onMessage, onClose } = {}) {
  let tick = 0
  const emit = message => onMessage?.({ timestamp: Date.now(), ...message })

  onOpen?.()
  emit({
    type: 'SNAPSHOT',
    data: mockState.printers.map(printer => ({ printerId: printer.id, data: buildPrinterData(printer) }))
  })

  const timer = window.setInterval(() => {
    tick += 1
    const printer = mockState.printers[tick % mockState.printers.length]
    if (!printer) return

    if (printer.status === 'OFFLINE') {
      emit({ type: 'PRINTER_OFFLINE', printerId: printer.id, data: { message: '设备暂时离线' } })
      return
    }

    emit({ type: 'PRINTER_STATUS', printerId: printer.id, data: buildPrinterData(printer) })
    if (printer.currentJobId) {
      emit({
        type: 'JOB_STATUS',
        printerId: printer.id,
        data: { currentJobId: printer.currentJobId, status: 'PRINTING', progress: Math.min(62 + tick, 99) }
      })
    }
  }, 5000)

  return {
    close() {
      window.clearInterval(timer)
      onClose?.()
    }
  }
}
