<template>
  <div v-if="!route.meta.hideBreadcrumb" class="app-breadcrumb">
    <t-breadcrumb separator="/">
      <t-breadcrumb-item v-for="item in breadcrumbs" :key="item.key">
        {{ item.title }}
      </t-breadcrumb-item>
    </t-breadcrumb>
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
  min-height: 2.025rem;
  margin-bottom: 1rem;
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
</style>
