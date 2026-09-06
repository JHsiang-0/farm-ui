<template>
  <t-layout v-cloak class="app-shell">
    <AppSidebar
      :collapsed="sidebarCollapsed"
      :is-mobile="isMobile"
      :mobile-open="mobileSidebarOpen"
    />
    <t-button
      v-if="isMobile && mobileSidebarOpen"
      variant="text"
      class="app-sidebar-overlay"
      aria-label="关闭导航菜单"
      @click="closeMobileSidebar"
    />

    <t-layout class="app-main-layout">
      <AppHeader
        :collapsed="isMobile ? !mobileSidebarOpen : sidebarCollapsed"
        @toggle-sidebar="toggleSidebar"
      />

      <t-content class="app-content">
        <div class="app-content__inner">
          <AppBreadcrumb />
      <div
        class="app-content__view"
        :class="{ 'app-content__view--page-scroll': route.meta.pageScroll }"
      >
            <router-view v-slot="{ Component }">
              <transition name="fade-transform" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </div>
        </div>
      </t-content>
    </t-layout>
  </t-layout>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'

defineOptions({ name: 'AppLayout' })

const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)
const isMobile = ref(false)
const route = useRoute()
let mediaQuery

const toggleSidebar = () => {
  if (isMobile.value) {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
    return
  }
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const closeMobileSidebar = () => {
  mobileSidebarOpen.value = false
}

const syncViewport = event => {
  isMobile.value = event.matches
  if (!isMobile.value) closeMobileSidebar()
}

watch(() => route.fullPath, closeMobileSidebar)

onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 768px)')
  isMobile.value = mediaQuery.matches
  mediaQuery.addEventListener('change', syncViewport)
})

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', syncViewport)
})
</script>

<style scoped>
.app-shell,
.app-main-layout {
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}

.app-main-layout {
  flex: 1 1 auto;
  min-height: 0;
}

.app-sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  width: 100%;
  height: 100%;
  padding: 0;
  background: var(--td-mask-active);
  border: 0;
  cursor: pointer;
}

.app-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--app-page-background);
}

.app-content__inner {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  width: 100%;
  height: auto;
  min-width: 0;
  min-height: 0;
  overflow: visible;
  padding: var(--app-content-padding);
}

.app-content__view {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  overscroll-behavior: contain;
}

.app-content__view--page-scroll {
  overflow-x: hidden;
  overflow-y: auto;
}

.app-content__view--page-scroll > * {
  flex: 0 0 auto;
  min-height: 100%;
}

.app-content__view--page-scroll > .app-page-shell {
  height: auto;
  overflow: visible;
}

.app-content__view > * {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.2s ease;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 768px) {
  .app-content__inner {
    padding: var(--app-spacing-4);
  }
}
</style>
