<template>
  <t-aside
    class="app-sidebar"
    :class="{ 'app-sidebar--mobile-hidden': props.collapsed }"
    :width="props.collapsed ? '64px' : '232px'"
  >
    <button type="button" class="app-brand" :title="props.collapsed ? '打印农场' : ''" @click="goDashboard">
      <span class="app-brand__mark">3D</span>
      <span v-if="!props.collapsed" class="app-brand__name">打印农场</span>
    </button>

    <t-menu :value="activePath" :collapsed="props.collapsed" theme="light" class="app-menu">
      <t-menu-group v-for="group in visibleGroups" :key="group.key" :title="props.collapsed ? '' : group.label">
        <t-menu-item
          v-for="item in group.items"
          :key="item.key"
          :value="item.to"
          @click="handleItemClick(item)"
        >
          <template #icon>
            <component :is="item.icon" :size="18" />
          </template>
          {{ item.title }}
        </t-menu-item>
      </t-menu-group>
    </t-menu>

    <div v-if="!props.collapsed" class="app-sidebar__footer">
      <span>3D 打印农场管理系统</span>
      <span>v1.0.0</span>
    </div>
  </t-aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { navigationGroups } from '@/config/navigation'

defineOptions({ name: 'AppSidebar' })

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activePath = computed(() => route.path)
const visibleGroups = computed(() => navigationGroups.map(group => ({
  ...group,
  items: group.items.filter(item => !item.roles || userStore.hasRole(item.roles))
})).filter(group => group.items.length > 0))

const goDashboard = () => {
  router.push('/dashboard')
}

const handleItemClick = item => {
  if (route.path !== item.to) {
    router.push(item.to)
  }
}

</script>

<style scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--app-surface);
  border-right: 1px solid var(--app-border);
  flex-shrink: 0;
  transition: width 0.2s ease;
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  height: 64px;
  padding: 0 1.25rem;
  color: var(--app-text-primary);
  text-align: left;
  background: var(--app-surface);
  border: 0;
  border-bottom: 1px solid var(--app-border);
  cursor: pointer;
  flex-shrink: 0;
}

.app-brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  background: #0052d9;
  border-radius: 6px;
  flex-shrink: 0;
}

.app-brand__name {
  overflow: hidden;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-menu {
  min-height: 0;
  padding: 0.75rem 0.5rem;
  border-right: 0;
  overflow-y: auto;
  flex: 1;
}

.app-sidebar__footer {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 1.25rem;
  color: var(--app-text-placeholder);
  font-size: 0.75rem;
  border-top: 1px solid var(--app-border);
  flex-shrink: 0;
}

:deep(.t-menu__group-title) {
  padding: 0.75rem 0.75rem 0.375rem;
  color: var(--app-text-placeholder);
  font-size: 0.75rem;
}

:deep(.t-menu__item) {
  margin: 0.125rem 0;
  border-radius: 6px;
}

:deep(.t-menu__item.t-is-active) {
  color: #0052d9;
  background: #e8f3ff;
}

@media (max-width: 768px) {
  .app-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 20;
    transform: translateX(0);
  }

  .app-sidebar.app-sidebar--mobile-hidden {
    transform: translateX(-100%);
  }
}
</style>
