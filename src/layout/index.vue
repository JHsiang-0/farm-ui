<template>
  <el-container v-cloak class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="aside" :class="{ 'is-collapse': isCollapse }">
      <div class="logo">
        <el-icon :size="32" class="logo-icon">
          <monitor />
        </el-icon>
        <span v-show="!isCollapse" class="logo-text">3D打印农场</span>
      </div>

      <el-menu router :default-active="$route.path" :collapse="isCollapse" :collapse-transition="false"
        background-color="var(--ep-color-white)" text-color="var(--ep-text-color-regular)"
        active-text-color="var(--el-color-primary)" class="custom-menu">
        <el-menu-item index="/">
          <el-icon>
            <odometer />
          </el-icon>
          <template #title>监控大屏</template>
        </el-menu-item>

        <el-menu-item index="/printers">
          <el-icon>
            <printer />
          </el-icon>
          <template #title>机器管理</template>
        </el-menu-item>

        <el-menu-item index="/files">
          <el-icon><folder-opened /></el-icon>
          <template #title>切片文件库</template>
        </el-menu-item>

        <el-menu-item index="/jobs">
          <el-icon>
            <list />
          </el-icon>
          <template #title>生产队列</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container class="main-wrapper">
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-left">
          <div class="collapse-btn" @click="toggleCollapse" :title="isCollapse ? '展开菜单' : '收起菜单'">
            <el-icon :size="18" :class="{ 'is-rotate': isCollapse }">
              <fold v-if="!isCollapse" />
              <expand v-else />
            </el-icon>
          </div>

          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute.name">{{ currentRoute.name }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <!-- 消息通知 -->
          <el-badge :value="3" class="message-badge" type="danger">
            <el-icon :size="20" class="message-icon">
              <bell />
            </el-icon>
          </el-badge>

          <!-- 用户下拉菜单 -->
          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="36" :src="userStore.userInfo.avatar || defaultAvatar" class="user-avatar">
                {{ userStore.userInfo.username?.charAt(0).toUpperCase() || 'U' }}
              </el-avatar>
              <span v-show="!isCollapse" class="username">{{ userStore.userInfo.username || '管理员' }}</span>
              <el-icon class="dropdown-icon"><arrow-down /></el-icon>
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
      <el-main class="main-content">
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
    '/jobs': { name: '生产队列', icon: 'List' }
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
   v-cloak: 防止 Vue 未加载完成时显示内容
   ============================================ */
[v-cloak] {
  display: none !important;
}

.layout-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* ============================================
   Sidebar - 侧边栏样式
   ============================================ */
.aside {
  background-color: var(--ep-color-white);
  box-shadow: 2px 0 8px rgba(0, 21, 41, 0.08);
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ep-space-3);
  border-bottom: 1px solid var(--el-border-color-light);
  overflow: hidden;
  white-space: nowrap;
}

.logo-icon {
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.logo-text {
  font-size: var(--el-font-size-large);
  font-weight: 600;
  color: var(--el-text-color-primary);
  transition: opacity 0.3s;
}

.custom-menu {
  border-right: none;
  flex: 1;
  padding-top: var(--ep-space-2);
}

/* 菜单项样式优化 */
:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
  margin: 4px 12px;
  border-radius: var(--ep-border-radius-base);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.el-menu-item:hover) {
  background-color: var(--ep-color-gray-1);
  color: var(--el-color-primary);
}

:deep(.el-menu-item.is-active) {
  background-color: var(--ep-color-primary-light-6);
  color: var(--el-color-primary);
  border-left: 3px solid var(--el-color-primary);
  margin-left: 9px;
  padding-left: calc(var(--ep-space-4) - 3px) !important;
}

:deep(.el-menu-item .el-icon) {
  font-size: 18px;
  margin-right: var(--ep-space-3);
}

/* 折叠状态下的菜单样式 */
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
   Main Wrapper - 右侧主区域
   ============================================ */
.main-wrapper {
  background-color: var(--el-fill-color-lighter);
  display: flex;
  flex-direction: column;
}

/* ============================================
   Header - 顶栏样式
   ============================================ */
.header {
  height: 60px;
  background-color: var(--ep-color-white);
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--ep-space-6);
  z-index: 5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--ep-space-4);
}

.collapse-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ep-border-radius-base);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--el-text-color-regular);
}

.collapse-btn:hover {
  background-color: var(--ep-color-gray-1);
  color: var(--el-color-primary);
}

.collapse-btn .el-icon {
  transition: transform 0.3s;
}

.collapse-btn .el-icon.is-rotate {
  transform: rotate(180deg);
}

.breadcrumb {
  font-size: var(--el-font-size-base);
}

:deep(.el-breadcrumb__inner) {
  color: var(--el-text-color-regular);
}

:deep(.el-breadcrumb__inner.is-link:hover) {
  color: var(--el-color-primary);
}

:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--ep-space-5);
}

/* 消息通知 */
.message-badge {
  cursor: pointer;
  padding: 8px;
  border-radius: var(--ep-border-radius-base);
  transition: background-color 0.2s;
}

.message-badge:hover {
  background-color: var(--ep-color-gray-1);
}

.message-icon {
  color: var(--el-text-color-regular);
}

/* 用户信息 */
.user-info {
  display: flex;
  align-items: center;
  gap: var(--ep-space-3);
  cursor: pointer;
  padding: 6px 12px;
  border-radius: var(--ep-border-radius-base);
  transition: background-color 0.2s;
}

.user-info:hover {
  background-color: var(--ep-color-gray-1);
}

.user-avatar {
  background: linear-gradient(135deg, var(--ep-color-primary) 0%, var(--ep-color-primary-dark-1) 100%);
  color: var(--ep-color-white);
  font-weight: 600;
}

.username {
  font-size: var(--el-font-size-base);
  color: var(--el-text-color-primary);
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-icon {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  transition: transform 0.2s;
}

.user-info:hover .dropdown-icon {
  transform: rotate(180deg);
}

/* ============================================
   Main Content - 主内容区
   ============================================ */
.main-content {
  padding: var(--ep-space-6);
  overflow-y: auto;
  overflow-x: hidden;
}

/* ============================================
   Route Transition - 路由过渡动画
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
   Responsive - 响应式适配
   ============================================ */
@media (max-width: 768px) {
  .aside {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
  }

  .aside.is-collapse {
    transform: translateX(0);
  }

  .main-wrapper {
    margin-left: 0;
  }

  .username {
    display: none;
  }
}
</style>
