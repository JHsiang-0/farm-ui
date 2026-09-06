<template>
  <div v-cloak class="app-root" :class="{ 'app-root--desktop': isDesktopApp }">
    <DesktopTitleBar v-if="showDesktopTitleBar" />
    <div id="app-container">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DesktopTitleBar from '@/components/layout/DesktopTitleBar.vue'

defineOptions({ name: 'AppRoot' })

const route = useRoute()
const isDesktopApp = Boolean(window.farmDesktop?.isDesktop)
const showDesktopTitleBar = computed(() => isDesktopApp && !route.matched.some(record => record.meta?.fullscreen))
</script>

<style>
/* ============================================
   v-cloak: 防止 Vue 未加载完成时显示内容
   ============================================ */
[v-cloak] {
  display: none !important;
}

.app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

#app-container {
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
</style>
