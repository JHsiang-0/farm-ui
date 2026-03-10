import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import Layout from '@/layout/index.vue' // 引入刚写的布局组件

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue')
    },
    // 将 Layout 设置为根路由
    {
      path: '/',
      component: Layout, 
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
          path: 'files', 
          name: 'files',
          component: () => import('../views/FileLibrary.vue') 
        },
        { 
          path: 'jobs', 
          name: 'jobs',
          component: () => import('../views/JobQueue.vue') 
        },
        // 👇 未来这里可以继续加：
        // { path: 'printers', component: () => import('../views/PrinterManage.vue') },
        // { path: 'files', component: () => import('../views/FileLibrary.vue') },
      ]
    }
  ]
})

// 全局路由守卫（门禁系统）
router.beforeEach((to, from) => {
  const userStore = useUserStore()
  
  // 如果用户要去非登录页，但没有 token，一律踢回登录页
  if (to.path !== '/login' && !userStore.token) {
    return '/login'
  } 
  // 如果用户已经登录了，还想去登录页，一律踢回大屏主页
  if (to.path === '/login' && userStore.token) {
    return '/'
  } 
  // 其他情况，正常放行（不返回或返回 true/undefined）
})

export default router