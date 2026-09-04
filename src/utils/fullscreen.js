const getDesktopApi = () => {
  if (typeof window === 'undefined') return null
  return window.farmDesktop?.isDesktop ? window.farmDesktop : null
}

export const enterAppFullscreen = async () => {
  const desktopApi = getDesktopApi()
  if (desktopApi?.setFullscreen) {
    await desktopApi.setFullscreen(true)
    return
  }

  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    await document.documentElement.requestFullscreen()
  }
}

export const exitAppFullscreen = async () => {
  const desktopApi = getDesktopApi()
  if (desktopApi?.setFullscreen) {
    await desktopApi.setFullscreen(false)
    return
  }

  if (document.fullscreenElement && document.exitFullscreen) {
    await document.exitFullscreen()
  }
}
