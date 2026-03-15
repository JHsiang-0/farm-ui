<template>
  <el-container v-cloak class="h-full w-full overflow-hidden">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'"
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

        <el-icon :size="32" class="text-primary shrink-0" style="filter: drop-shadow(0 2px 4px rgba(17, 24, 39, 0.2));">
          <monitor />
        </el-icon>
        <span v-show="!isCollapse"
          class="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-800 bg-clip-text text-transparent tracking-wide">嘉东三维打印控制系统</span>
      </div>

      <el-menu router :default-active="$route.path" :collapse="isCollapse" :collapse-transition="false"
        background-color="transparent" text-color="var(--ep-text-color-regular)"
        active-text-color="var(--el-color-primary)" class="custom-menu flex-1 pt-2 overflow-y-auto">
        <el-sub-menu index="/dashboard">
          <template #title>
            <el-icon>
              <odometer />
            </el-icon>
            <span>车间监控</span>
          </template>
          <el-menu-item index="/" class="workshop-menu-item">
            <span class="workshop-name">3F-一号车间</span>
          </el-menu-item>
          <el-menu-item index="/workshop-2" class="workshop-menu-item" disabled>
            <span class="workshop-name">3F-二号车间</span>
            <el-tag size="small" type="info" class="workshop-status">规划中</el-tag>
          </el-menu-item>
          <el-menu-item index="/workshop-3" class="workshop-menu-item" disabled>
            <span class="workshop-name">2F-原型车间</span>
            <el-tag size="small" type="info" class="workshop-status">规划中</el-tag>
          </el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/printers">
          <el-icon>
            <printer />
          </el-icon>
          <template #title>机器管理</template>
        </el-menu-item>

        <el-menu-item index="/files">
          <el-icon><folder-opened /></el-icon>
          <template #title>文件库</template>
        </el-menu-item>

        <el-sub-menu index="/tasks">
          <template #title>
            <el-icon>
              <list />
            </el-icon>
            <span>任务</span>
          </template>
          <el-menu-item index="/tasks/queue">
            <el-icon><list /></el-icon>
            <span>任务队列</span>
          </el-menu-item>
          <el-menu-item index="/tasks/history">
            <el-icon><document /></el-icon>
            <span>打印记录</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container class="bg-gray-50 flex flex-col h-full overflow-hidden">
      <!-- 顶栏 -->
      <el-header class="h-16 bg-white shadow-sm flex justify-between items-center px-6 z-5 shrink-0">
        <div class="flex items-center gap-4">
          <div
            class="w-9 h-9 flex items-center justify-center rounded hover:bg-gray-50 cursor-pointer transition-colors text-gray-600 hover:text-primary"
            @click="toggleCollapse" :title="isCollapse ? '展开菜单' : '收起菜单'">
            <el-icon :size="18" :class="{ 'rotate-180 transition-transform duration-300': isCollapse }">
              <fold v-if="!isCollapse" />
              <expand v-else />
            </el-icon>
          </div>

          <el-breadcrumb separator="/" class="text-sm">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute.name">{{ currentRoute.name }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="flex items-center gap-5">
          <!-- 消息通知 -->
          <div class="cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors">
            <el-badge :value="3" type="danger">
              <el-icon :size="20" class="text-gray-600">
                <bell />
              </el-icon>
            </el-badge>
          </div>

          <!-- 用户下拉菜单 -->
          <el-dropdown trigger="click" @command="handleCommand">
            <div class="flex items-center gap-3 cursor-pointer px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
              <el-avatar :size="36" :src="userStore.userInfo.avatar || defaultAvatar"
                class="bg-gradient-to-r from-primary to-gray-700 text-white font-semibold">
                {{ userStore.userInfo.username?.charAt(0).toUpperCase() || 'U' }}
              </el-avatar>
              <span v-show="!isCollapse" class="text-sm text-gray-900 font-medium max-w-24 truncate">
                {{ userStore.userInfo.username || '管理员' }}
              </span>
              <el-icon class="text-gray-400 text-xs transition-transform duration-200 group-hover:rotate-180">
                <arrow-down />
              </el-icon>
            </div>

            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon>
                    <user />
                  </el-icon>
                  个人中心
                </el-dropdown-item>
                <el-dropdown-item command="settings">
                  <el-icon>
                    <setting />
                  </el-icon>
                  系统设置
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><switch-button /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="overflow-hidden flex-1 p-0">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Monitor,
  Odometer,
  Printer,
  FolderOpened,
  List,
  Document,
  Fold,
  Expand,
  Bell,
  ArrowDown,
  User,
  Setting,
  SwitchButton
} from '@element-plus/icons-vue'

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

// 处理下拉菜单命令
const handleCommand = (command) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人中心功能开发中...')
      break
    case 'settings':
      ElMessage.info('系统设置功能开发中...')
      break
    case 'logout':
      handleLogout()
      break
  }
}

// 退出登录逻辑
const handleLogout = () => {
  ElMessageBox.confirm(
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
    ElMessage.success('已退出登录')
  }).catch(() => { })
}
</script>

<style scoped>
/* ============================================
   菜单项深度选择器样式
   ============================================ */
:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
  margin: 4px 12px;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.el-menu-item:hover) {
  background-color: #f3f4f6;
  color: #111827;
}

:deep(.el-menu-item.is-active) {
  background-color: #f3f4f6;
  color: #111827;
  margin-left: 12px;
  padding-left: 16px !important;
}

:deep(.el-menu-item .el-icon) {
  font-size: 18px;
  margin-right: 12px;
}

:deep(.el-sub-menu__title) {
  height: 50px;
  line-height: 50px;
  margin: 4px 12px;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.el-sub-menu__title:hover) {
  background-color: #f3f4f6;
  color: #111827;
}

:deep(.el-sub-menu.is-active .el-sub-menu__title) {
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

:deep(.el-menu--collapse) {
  width: 64px;
}

:deep(.el-menu--collapse .el-menu-item) {
  margin: 4px 8px;
  padding: 0 16px !important;
  justify-content: center;
}

:deep(.el-menu--collapse .el-menu-item.is-active) {
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
