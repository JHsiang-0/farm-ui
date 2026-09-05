<template>
  <main class="route-result-page">
    <div class="route-result-page__content">
      <div class="route-result-page__code" aria-hidden="true">{{ result.code }}</div>
      <t-empty
        :type="result.type"
        :title="result.title"
        :description="result.description"
      >
        <template #action>
          <t-button theme="primary" @click="goHome">返回工作台</t-button>
        </template>
      </t-empty>
    </div>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

defineOptions({ name: 'RouteResult' })

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const result = computed(() => route.name === 'forbidden'
  ? {
      code: '403',
      type: 'fail',
      title: '无权访问此页面',
      description: '当前账号没有执行此操作所需的权限。'
    }
  : {
      code: '404',
      type: 'empty',
      title: '页面不存在',
      description: '请检查地址，或返回工作台继续操作。'
    })

const goHome = () => {
  router.push(userStore.isAuthenticated ? '/dashboard' : '/login')
}
</script>

<style scoped>
.route-result-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  padding: var(--app-content-padding);
  background: var(--app-page-background);
}

.route-result-page__content {
  display: flex;
  align-items: center;
  flex-direction: column;
  max-width: 32rem;
  padding: var(--app-spacing-8);
  text-align: center;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-large);
  box-shadow: var(--app-shadow);
}

.route-result-page__code {
  margin-bottom: var(--app-spacing-2);
  color: var(--app-primary);
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
}

@media (max-width: 768px) {
  .route-result-page {
    padding: var(--app-spacing-4);
  }

  .route-result-page__content {
    width: 100%;
    padding: var(--app-spacing-6) var(--app-spacing-4);
  }
}
</style>
