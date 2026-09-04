import {
  DashboardIcon,
  FileIcon,
  FolderOpenIcon,
  ListNumberedIcon,
  PrintIcon,
  UserIcon
} from 'tdesign-icons-vue-next'

export const navigationGroups = [
  {
    key: 'workspace',
    label: '工作台',
    items: [
      { key: 'dashboard', title: '概览仪表盘', to: '/dashboard', icon: DashboardIcon }
    ]
  },
  {
    key: 'devices',
    label: '设备管理',
    items: [
      { key: 'printers', title: '打印机管理', to: '/printers', icon: PrintIcon }
    ]
  },
  {
    key: 'tasks',
    label: '文件与任务',
    items: [
      { key: 'files', title: '文件库', to: '/files', icon: FolderOpenIcon },
      { key: 'tasks-queue', title: '任务队列', to: '/tasks/queue', icon: ListNumberedIcon },
      { key: 'tasks-batch', title: '批量派发', to: '/batch-dispatch', icon: ListNumberedIcon },
      { key: 'tasks-history', title: '打印历史', to: '/tasks/history', icon: FileIcon }
    ]
  },
  {
    key: 'system',
    label: '系统管理',
    items: [
      { key: 'users', title: '用户管理', to: '/users', icon: UserIcon, roles: ['ADMIN'] }
    ]
  }
]

export const navigationItems = navigationGroups.flatMap(group => group.items)

export function getNavigationItem(path) {
  return navigationItems.find(item => item.to === path) || null
}
