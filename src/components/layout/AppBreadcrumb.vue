<template>
  <div class="app-breadcrumb">
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
  min-height: 24px;
  margin-bottom: 1rem;
}

:deep(.t-breadcrumb) {
  font-size: 0.8125rem;
}
</style>
