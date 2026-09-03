<template>
  <t-layout v-cloak class="h-full w-full overflow-hidden">
    <!-- 侧边栏 -->
    <t-aside :width="isCollapse ? '64px' : '220px'"
      class="bg-white relative z-10 flex flex-col transition-all duration-300" :class="{ 'is-collapse': isCollapse }">
      <!-- 右侧分隔线 -->
      <div class="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent">
      </div>

      <div
        class="h-16 flex items-center justify-center gap-3 border-b border-gray-100 overflow-hidden whitespace-nowrap relative bg-gradient-to-r from-white to-gray-50 shrink-0">
        <!-- 底部装饰线 -->
        <div
          class="absolute left-0 right-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-gray-300 via-gray-600 via-gray-300 to-transparent opacity-60">
        </div>

        <monitor :size="32" class="text-primary shrink-0"
          style="filter: drop-shadow(0 2px 4px rgba(17, 24, 39, 0.2));" />
        <span v-show="!isCollapse"
          class="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-800 bg-clip-text text-transparent tracking-wide">嘉东三维打印控制系统</span>
      </div>

      <t-menu
        :value="route.path"
        :collapsed="isCollapse"
        theme="light"
        @change="handleMenuChange"
        class="custom-menu flex-1 pt-2 overflow-y-auto"
      >
        <t-submenu value="/dashboard">
          <template #icon><Odometer /></template>
          <template #title>
            车间监控
          </template>
          <t-menu-item value="/" to="/" class="workshop-menu-item">
            <span class="workshop-name">3F-一号车间</span>
          </t-menu-item>
          <t-menu-item value="/workshop-2" class="workshop-menu-item" disabled>
            <span class="workshop-name">3F-二号车间</span>
            <t-tag size="small" theme="default" variant="light" class="workshop-status">规划中</t-tag>
          </t-menu-item>
          <t-menu-item value="/workshop-3" class="workshop-menu-item" disabled>
            <span class="workshop-name">2F-原型车间</span>
            <t-tag size="small" theme="default" variant="light" class="workshop-status">规划中</t-tag>
          </t-menu-item>
        </t-submenu>

        <t-menu-item value="/dashboard/fullscreen">
          <template #icon><Monitor /></template>
          全屏看板
        </t-menu-item>

        <t-menu-item value="/printers" to="/printers">
          <template #icon><Printer /></template>
          机器管理
        </t-menu-item>

        <t-menu-item v-if="userStore.isAdmin" value="/users" to="/users">
          <template #icon><User /></template>
          用户管理
        </t-menu-item>

        <t-menu-item value="/files" to="/files">
          <template #icon><FolderOpened /></template>
          文件库
        </t-menu-item>

        <t-submenu value="/tasks">
          <template #icon><List /></template>
          <template #title>
            任务
          </template>
          <t-menu-item value="/tasks/queue" to="/tasks/queue">
            <template #icon><List /></template>
            任务队列
          </t-menu-item>
          <t-menu-item value="/tasks/history" to="/tasks/history">
            <template #icon><Document /></template>
            打印记录
          </t-menu-item>
        </t-submenu>
      </t-menu>
    </t-aside>

    <t-layout class="bg-gray-50 flex flex-col h-full overflow-hidden">
      <!-- 顶栏 -->
      <t-header class="h-16 bg-white shadow-sm flex justify-between items-center px-6 z-5 shrink-0">
        <div class="flex items-center gap-4">
          <div
            class="w-9 h-9 flex items-center justify-center rounded hover:bg-gray-50 cursor-pointer transition-colors text-gray-600 hover:text-primary"
            @click="toggleCollapse" :title="isCollapse ? '展开菜单' : '收起菜单'">
            <span :class="{ 'rotate-180 transition-transform duration-300': isCollapse }">
              <fold v-if="!isCollapse" :size="18" />
              <expand v-else :size="18" />
            </span>
          </div>

          <t-breadcrumb separator="/" class="text-sm">
            <t-breadcrumb-item :to="{ path: '/' }">首页</t-breadcrumb-item>
            <t-breadcrumb-item v-if="currentRoute.name">{{ currentRoute.name }}</t-breadcrumb-item>
          </t-breadcrumb>
        </div>

        <div class="flex items-center gap-5">
          <!-- 消息通知 -->
          <div class="cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors">
            <t-badge :count="3" color="#dc2626">
              <bell :size="20" class="text-gray-600" />
            </t-badge>
          </div>

          <!-- 用户下拉菜单 -->
          <t-dropdown trigger="click" @click="handleCommand">
            <div class="flex items-center gap-3 cursor-pointer px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
              <t-avatar :size="36" :image="userStore.userInfo.avatar || defaultAvatar"
                class="bg-gradient-to-r from-primary to-gray-700 text-white font-semibold">
                {{ userStore.userInfo.username?.charAt(0).toUpperCase() || 'U' }}
              </t-avatar>
              <span v-show="!isCollapse" class="text-sm text-gray-900 font-medium max-w-24 truncate">
                {{ userStore.userInfo.username || '管理员' }}
              </span>
              <span class="text-gray-400 text-xs transition-transform duration-200 group-hover:rotate-180">
                <arrow-down />
              </span>
            </div>

            <template #dropdown>
              <t-dropdown-menu>
                <t-dropdown-item value="profile">
                  <span>
                    <user />
                  </span>
                  个人中心
                </t-dropdown-item>
                <t-dropdown-item value="settings">
                  <span>
                    <setting />
                  </span>
                  系统设置
                </t-dropdown-item>
                <t-dropdown-item value="logout" divider>
                  <span><switch-button /></span>
                  退出登录
                </t-dropdown-item>
              </t-dropdown-menu>
            </template>
          </t-dropdown>
        </div>
      </t-header>

      <!-- 主内容区 -->
      <t-content class="overflow-hidden flex-1 p-0">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </t-content>
    </t-layout>
  </t-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { message, confirmMessage } from '@/utils/message'
import { enterAppFullscreen } from '@/utils/fullscreen'
import {
  DesktopIcon as Monitor,
  DashboardIcon as Odometer,
  PrintIcon as Printer,
  FolderOpenIcon as FolderOpened,
  ListNumberedIcon as List,
  FileIcon as Document,
  MenuFoldIcon as Fold,
  MenuUnfoldIcon as Expand,
  NotificationIcon as Bell,
  ChevronDownIcon as ArrowDown,
  UserIcon as User,
  SettingIcon as Setting,
  PoweroffIcon as SwitchButton
} from 'tdesign-icons-vue-next'

defineOptions({ name: 'AppLayout' })

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 侧边栏折叠状态
const isCollapse = ref(false)

// 默认头像（当没有头像时使用）
const defaultAvatar = ''

// 当前路由信息
const currentRoute = computed(() => {
  const map = {
    '/': { name: '监控大屏', icon: 'Odometer' },
    '/printers': { name: '机器管理', icon: 'Printer' },
    '/files': { name: '切片文件库', icon: 'FolderOpened' },
    '/tasks': { name: '任务管理', icon: 'List' },
    '/tasks/queue': { name: '任务队列', icon: 'List' },
    '/tasks/history': { name: '打印记录', icon: 'Document' }
  }
  return map[route.path] || { name: '', icon: '' }
})

// 切换侧边栏折叠
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

// TDesign 菜单通过 value/to 与 Vue Router 联动。
const handleMenuChange = (value) => {
  const target = typeof value === 'string' ? value : value?.value
  if (target === '/dashboard/fullscreen') {
    void enterAppFullscreen()
    router.push({ name: 'fullscreen-dashboard' })
    return
  }

  if (target && target !== route.path) {
    router.push(target)
  }
}

// 处理下拉菜单命令
const handleCommand = (item) => {
  const command = typeof item === 'string' ? item : item?.value
  switch (command) {
    case 'profile':
      message.info('个人中心功能开发中...')
      break
    case 'settings':
      message.info('系统设置功能开发中...')
      break
    case 'logout':
      handleLogout()
      break
  }
}

// 退出登录逻辑
const handleLogout = () => {
  confirmMessage(
    '确定要退出登录吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    userStore.logout()
    router.push('/login')
    message.success('已退出登录')
  }).catch(() => { })
}
</script>

<style scoped>
/* ============================================
   菜单项深度选择器样式
   ============================================ */
:deep(.t-menu__item) {
  height: 50px;
  line-height: 50px;
  margin: 4px 12px;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.t-menu__item:hover) {
  background-color: #f3f4f6;
  color: #111827;
}

:deep(.t-menu__item.t-is-active) {
  background-color: #f3f4f6;
  color: #111827;
  margin-left: 12px;
  padding-left: 16px !important;
}

:deep(.t-menu__item .t-icon) {
  font-size: 18px;
  margin-right: 12px;
}

:deep(.t-submenu__title) {
  height: 50px;
  line-height: 50px;
  margin: 4px 12px;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.t-submenu__title:hover) {
  background-color: #f3f4f6;
  color: #111827;
}

:deep(.t-submenu.t-is-active .t-submenu__title) {
  color: #111827;
  font-weight: 600;
}

:deep(.workshop-menu-item) {
  height: 44px;
  line-height: 44px;
  margin: 2px 12px 2px 24px;
  padding-left: 12px !important;
  border-radius: 6px;
}

:deep(.workshop-menu-item.is-active) {
  background-color: #f3f4f6;
  border-left: none;
  margin-left: 24px;
  padding-left: 12px !important;
}

:deep(.workshop-menu-item .workshop-name) {
  font-size: 13px;
  flex: 1;
}

:deep(.workshop-menu-item .workshop-status) {
  margin-left: 8px;
  font-size: 11px;
  height: 20px;
  line-height: 18px;
  padding: 0 6px;
}

:deep(.t-menu--collapse) {
  width: 64px;
}

:deep(.t-menu--collapse .t-menu__item) {
  margin: 4px 8px;
  padding: 0 16px !important;
  justify-content: center;
}

:deep(.t-menu--collapse .t-menu__item.t-is-active) {
  margin-left: 5px;
  padding-left: 13px !important;
}

/* ============================================
   路由过渡动画
   ============================================ */
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* ============================================
   响应式适配
   ============================================ */
@media (max-width: 768px) {
  :deep(.aside) {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
  }

  :deep(.aside.is-collapse) {
    transform: translateX(0);
  }

  .username {
    display: none;
  }
}
</style>
