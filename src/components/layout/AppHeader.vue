<template>
  <t-header class="app-header">
    <div class="app-header__left">
      <button
        type="button"
        class="header-icon-button"
        :aria-label="collapsed ? '展开菜单' : '收起菜单'"
        :title="collapsed ? '展开菜单' : '收起菜单'"
        @click="$emit('toggle-sidebar')"
      >
        <MenuUnfoldIcon v-if="collapsed" :size="20" />
        <MenuFoldIcon v-else :size="20" />
      </button>

    </div>

    <div class="app-header__right">
      <button
        type="button"
        class="header-icon-button"
        aria-label="实时设备看板"
        title="实时设备看板"
        @click="openFullscreenDashboard"
      >
        <DesktopIcon :size="19" />
      </button>
      <button type="button" class="header-icon-button" aria-label="消息通知" title="消息通知" @click="message.info('暂无新的系统通知')">
        <MailIcon :size="19" />
      </button>
      <button type="button" class="header-icon-button app-header__optional-action" aria-label="帮助中心" title="帮助中心" @click="message.info('帮助中心将在后续版本开放')">
        <HelpCircleIcon :size="19" />
      </button>
      <button type="button" class="header-icon-button app-header__optional-action" aria-label="系统设置" title="系统设置" @click="message.info('系统设置将在后续版本开放')">
        <SettingIcon :size="19" />
      </button>
      <AppUserMenu />
    </div>
  </t-header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import {
  DesktopIcon,
  HelpCircleIcon,
  MailIcon,
  MenuFoldIcon,
  MenuUnfoldIcon,
  SettingIcon
} from 'tdesign-icons-vue-next'
import { message } from '@/utils/message'
import { enterAppFullscreen } from '@/utils/fullscreen'
import AppUserMenu from './AppUserMenu.vue'

defineOptions({ name: 'AppHeader' })

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle-sidebar'])

const router = useRouter()

const openFullscreenDashboard = async () => {
  try {
    await enterAppFullscreen()
  } catch (error) {
    console.warn('进入原生全屏失败，将继续打开全屏看板:', error)
  }

  router.push('/dashboard/fullscreen')
}

</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--app-header-height);
  padding: 0 var(--app-content-padding);
  background: var(--app-surface);
  border-bottom: 1px solid var(--app-border);
  flex-shrink: 0;
}

.app-header__left,
.app-header__right {
  display: flex;
  align-items: center;
}

.app-header__left {
  gap: 1.25rem;
}

.app-header__right {
  gap: 0.5rem;
}

.header-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--app-text-secondary);
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.header-icon-button:hover {
  color: var(--app-text-primary);
  background: var(--app-surface-muted);
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 var(--app-spacing-4);
  }

  .app-header__right .app-header__optional-action {
    display: none;
  }
}
</style>
