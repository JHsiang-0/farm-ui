<template>
  <div class="h-full bg-gray-50 flex flex-col overflow-hidden">
    <!-- 页面头部 -->
    <t-card class="shadow-sm rounded-xl mb-6">
      <template #header>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3 text-lg font-semibold text-gray-900">
            <list :size="20" class="text-gray-600" />
            <span>任务管理</span>
          </div>
        </div>
      </template>
    </t-card>

    <!-- 导航标签 -->
    <t-tabs v-model="activeTab" theme="card" class="task-tabs mb-6">
      <t-tab-panel label="任务队列" value="queue">
        <router-view v-if="activeTab === 'queue'" />
      </t-tab-panel>
      <t-tab-panel label="打印记录" value="history">
        <router-view v-if="activeTab === 'history'" />
      </t-tab-panel>
    </t-tabs>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-hidden">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ListNumberedIcon as List } from 'tdesign-icons-vue-next'

defineOptions({ name: 'TaskManagement' })

const activeTab = ref('queue')
const route = useRoute()
const router = useRouter()

// 监听路由变化以同步标签页
watch(() => route.path, (newPath) => {
  if (newPath.includes('history')) {
    activeTab.value = 'history'
  } else {
    activeTab.value = 'queue'
  }
})

// 监听标签页切换以导航到对应的路由
watch(activeTab, (newTab) => {
  if (newTab === 'queue') {
    router.push('/tasks/queue')
  } else if (newTab === 'history') {
    router.push('/tasks/history')
  }
})

// 初始化时根据路由设置标签页
if (route.path.includes('history')) {
  activeTab.value = 'history'
} else {
  activeTab.value = 'queue'
}
</script>

<style scoped>
.task-tabs {
  .t-tabs__nav-wrap {
    background: transparent;
  }

  .t-tabs__nav {
    padding: 0;
  }

  .t-tabs__item {
    font-weight: 500;
  }

  .t-tabs__item.is-active {
    color: var(--farm-color-primary);
  }

  .t-tabs__active-bar {
    background-color: var(--farm-color-primary);
  }
}
</style>
