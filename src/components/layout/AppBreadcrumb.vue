<template>
  <div v-if="!route.meta.hideBreadcrumb" class="app-breadcrumb">
    <div class="app-breadcrumb__row">
      <t-breadcrumb separator="/">
        <t-breadcrumb-item v-for="item in breadcrumbs" :key="item.key">
          {{ item.title }}
        </t-breadcrumb-item>
      </t-breadcrumb>
      <div class="app-breadcrumb__actions" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineOptions({ name: 'AppBreadcrumb' })

const route = useRoute()

const breadcrumbs = computed(() => route.matched
  .filter(record => record.meta?.title)
  .map(record => ({
    key: record.name || record.path,
    title: record.meta.title
  })))
</script>

<style scoped>
.app-breadcrumb {
  min-height: 2.5rem;
  margin-bottom: 1rem;
}

.app-breadcrumb__row {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  width: 100%;
}

.app-breadcrumb__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: auto;
}

:deep(.t-breadcrumb) {
  color: var(--app-text-primary);
  font-size: var(--app-page-title-size);
  font-weight: 700;
  line-height: var(--app-page-title-line-height);
}

:deep(.t-breadcrumb__item),
:deep(.t-breadcrumb__inner),
:deep(.t-breadcrumb__inner-text) {
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
}

:deep(.t-breadcrumb__separator) {
  color: var(--app-text-secondary);
  font-size: 1rem;
}

@media (max-width: 768px) {
  .app-breadcrumb__row {
    align-items: flex-start;
    flex-direction: column;
  }

  .app-breadcrumb__actions {
    width: 100%;
  }
}
</style>
