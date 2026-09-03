<template>
  <t-dropdown trigger="click" @click="handleCommand">
    <button type="button" class="user-menu-trigger">
      <t-avatar :size="32" :image="userStore.userInfo.avatar || undefined">
        {{ userStore.userInfo.username?.charAt(0).toUpperCase() || 'U' }}
      </t-avatar>
      <span class="user-menu-trigger__name">{{ userStore.userInfo.username || '管理员' }}</span>
      <ChevronDownIcon :size="16" class="user-menu-trigger__arrow" />
    </button>

    <template #dropdown>
      <t-dropdown-menu>
        <t-dropdown-item value="profile">
          <template #prefix><UserIcon /></template>
          个人中心
        </t-dropdown-item>
        <t-dropdown-item value="settings">
          <template #prefix><SettingIcon /></template>
          系统设置
        </t-dropdown-item>
        <t-dropdown-item value="logout" divider>
          <template #prefix><PoweroffIcon /></template>
          退出登录
        </t-dropdown-item>
      </t-dropdown-menu>
    </template>
  </t-dropdown>
</template>

<script setup>
import { useRouter } from 'vue-router'
import {
  ChevronDownIcon,
  PoweroffIcon,
  SettingIcon,
  UserIcon
} from 'tdesign-icons-vue-next'
import { useUserStore } from '@/stores/user'
import { confirmMessage, message } from '@/utils/message'

defineOptions({ name: 'AppUserMenu' })

const router = useRouter()
const userStore = useUserStore()

const handleCommand = item => {
  const command = typeof item === 'string' ? item : item?.value

  if (command === 'profile') {
    message.info('个人中心功能将在后续版本开放')
  } else if (command === 'settings') {
    message.info('系统设置功能将在后续版本开放')
  } else if (command === 'logout') {
    confirmMessage('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      userStore.logout()
      router.push('/login')
      message.success('已退出登录')
    }).catch(() => {})
  }
}
</script>

<style scoped>
.user-menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 40px;
  padding: 0 0.5rem;
  color: var(--app-text-primary);
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.user-menu-trigger:hover {
  background: var(--app-surface-muted);
}

.user-menu-trigger__name {
  max-width: 8rem;
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu-trigger__arrow {
  color: var(--app-text-secondary);
  transition: transform 0.2s ease;
}

.user-menu-trigger:hover .user-menu-trigger__arrow {
  transform: translateY(1px);
}
</style>
