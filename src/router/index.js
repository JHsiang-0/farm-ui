import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { message } from '@/utils/message'
import Layout from '@/layout/index.vue' // 引入刚写的布局组件

const APP_ROLES = ['ADMIN', 'OPERATOR']
const isDesktop = import.meta.env.MODE.startsWith('desktop')

const router = createRouter({
  history: isDesktop
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/dashboard/fullscreen',
      name: 'fullscreen-dashboard',
      component: () => import('../views/FullscreenDashboard.vue'),
      meta: { title: '实时设备看板', requiresAuth: true, roles: APP_ROLES, fullscreen: true }
    },
    // 将 Layout 设置为根路由
    {
      path: '/',
      component: Layout, 
      meta: { requiresAuth: true, roles: APP_ROLES },
      children: [
        {
          path: '',
          name: 'dashboard',
          redirect: { name: 'dashboard-overview' }
        },
        {
          path: 'dashboard',
          name: 'dashboard-overview',
          component: () => import('../views/Dashboard.vue'),
          meta: { title: '概览仪表盘', hideBreadcrumb: true }
        },
        {
          path: 'printers',
          name: 'printers',
          component: () => import('../views/PrinterManage.vue'),
          meta: { title: '打印机管理', hideBreadcrumb: true }
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('../views/UserManagement.vue'),
          meta: { title: '用户管理', roles: ['ADMIN'], hideBreadcrumb: true }
        },
        {
          path: 'files',
          name: 'files',
          component: () => import('../views/FileLibrary.vue'),
          meta: { title: '文件库' }
        },
        {
          path: 'tasks',
          name: 'tasks',
          component: () => import('../views/TaskManagement.vue'),
          redirect: '/tasks/queue',
          children: [
            {
              path: 'queue',
              name: 'tasks-queue',
              component: () => import('../views/JobQueue.vue'),
              meta: { title: '任务队列', hideBreadcrumb: true }
            },
            {
              path: 'history',
              name: 'tasks-history',
              component: () => import('../views/JobHistory.vue'),
              meta: { title: '打印历史', hideBreadcrumb: true }
            }
          ]
        }
      ]
    }
  ]
})

// 全局路由守卫（门禁系统）
router.beforeEach((to) => {
  const userStore = useUserStore()

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  if (requiresAuth && !userStore.token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 如果用户已经登录了，还想去登录页，一律踢回打印机主页
  if (to.path === '/login' && userStore.token) {
    return { name: 'printers' }
  }

  const roleRequirements = to.matched
    .map(record => record.meta.roles)
    .filter(roles => Array.isArray(roles) && roles.length > 0)
  const hasRequiredRoles = roleRequirements.every(roles => userStore.hasRole(roles))
  if (roleRequirements.length > 0 && !hasRequiredRoles) {
    message.error('当前账号没有访问该页面的权限')
    return { name: 'printers' }
  }
})

export default router
