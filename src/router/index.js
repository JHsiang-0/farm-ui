import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { message } from '@/utils/message'
import Layout from '@/layout/index.vue' // 引入刚写的布局组件

const APP_ROLES = ['ADMIN', 'OPERATOR']
const isDesktop = import.meta.env.MODE === 'desktop'

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
    // 将 Layout 设置为根路由
    {
      path: '/',
      component: Layout, 
      meta: { requiresAuth: true, roles: APP_ROLES },
      children: [
        {
          // path 为空代表默认加载的子页面
          path: '', 
          name: 'dashboard',
          component: () => import('../components/FarmDashboard.vue')
        },
        { 
          path: 'printers', 
          name: 'printers',
          component: () => import('../views/PrinterManage.vue') 
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('../views/UserManagement.vue'),
          meta: { roles: ['ADMIN'] }
        },
        { 
          path: 'files', 
          name: 'files',
          component: () => import('../views/FileLibrary.vue') 
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
              component: () => import('../views/JobQueue.vue')
            },
            {
              path: 'history',
              name: 'tasks-history',
              component: () => import('../views/JobHistory.vue')
            }
          ]
        },
        // 👇 未来这里可以继续加：
        // { path: 'printers', component: () => import('../views/PrinterManage.vue') },
        // { path: 'files', component: () => import('../views/FileLibrary.vue') },
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

  // 如果用户已经登录了，还想去登录页，一律踢回大屏主页
  if (to.path === '/login' && userStore.token) {
    return { name: 'dashboard' }
  }

  const requiredRoles = to.matched.flatMap(record => record.meta.roles || [])
  if (requiredRoles.length > 0 && !userStore.hasRole(requiredRoles)) {
    message.error('当前账号没有访问该页面的权限')
    return { name: 'dashboard' }
  }
})

export default router
