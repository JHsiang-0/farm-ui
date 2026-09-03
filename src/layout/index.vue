<template>
  <t-layout v-cloak class="app-shell">
    <AppSidebar :collapsed="sidebarCollapsed" />

    <t-layout class="app-main-layout">
      <AppHeader :collapsed="sidebarCollapsed" @toggle-sidebar="toggleSidebar" />

      <t-content class="app-content">
        <div class="app-content__inner">
          <AppBreadcrumb />
          <router-view v-slot="{ Component }">
            <transition name="fade-transform" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </t-content>
    </t-layout>
  </t-layout>
</template>

<script setup>
import { ref } from 'vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'

defineOptions({ name: 'AppLayout' })

const sidebarCollapsed = ref(false)

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<style scoped>
.app-shell,
.app-main-layout {
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}

.app-content {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: var(--app-page-background);
}

.app-content__inner {
  min-height: 100%;
  padding: 1.5rem;
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
    padding: 1rem;
  }
}
</style>
