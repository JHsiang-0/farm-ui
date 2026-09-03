<template>
  <div class="fullscreen-dashboard">
    <FarmDashboard />

    <div class="fullscreen-dashboard__actions">
      <t-button
        type="button"
        size="small"
        variant="outline"
        @click.stop="leaveFullscreenDashboard"
      >
        退出全屏
      </t-button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import FarmDashboard from '@/components/FarmDashboard.vue'
import { exitAppFullscreen } from '@/utils/fullscreen'

defineOptions({ name: 'FullscreenDashboard' })

const router = useRouter()
let leaving = false
let removeDesktopFullscreenListener = null

const leaveFullscreenDashboard = () => {
  if (leaving) return
  leaving = true

  // 不等待全屏 API 的异步结果，确保按钮点击后立即恢复普通页面。
  void exitAppFullscreen().catch(error => {
    console.warn('退出全屏失败，将继续返回普通监控页:', error)
  })
  void router.replace({ name: 'printers' })
}

const handleBrowserFullscreenChange = () => {
  if (window.farmDesktop?.isDesktop) return

  if (!document.fullscreenElement) {
    void leaveFullscreenDashboard()
  }
}

const handleDesktopFullscreenChange = isFullscreen => {
  if (!isFullscreen) {
    void leaveFullscreenDashboard()
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', handleBrowserFullscreenChange)
  removeDesktopFullscreenListener = window.farmDesktop?.onFullscreenChange?.(handleDesktopFullscreenChange) || null
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleBrowserFullscreenChange)
  removeDesktopFullscreenListener?.()
  void exitAppFullscreen().catch(() => {})
})
</script>

<style scoped>
.fullscreen-dashboard {
  position: relative;
  width: 100vw;
  height: 100dvh;
  min-height: 100%;
  overflow: hidden;
  background: #f3f4f6;
}

.fullscreen-dashboard__actions {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 100;
  pointer-events: auto;
}
</style>
