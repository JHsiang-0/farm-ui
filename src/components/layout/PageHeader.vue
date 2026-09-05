<template>
  <header class="app-page-header">
    <div class="app-page-header__heading">
      <h1 class="app-page-header__title">{{ title }}</h1>
      <p v-if="description" class="app-page-header__description">{{ description }}</p>
    </div>
    <div v-if="$slots.filter || $slots.actions" class="app-page-header__actions">
      <slot name="filter" />
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup>
defineOptions({ name: 'PageHeader' })

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' }
})
</script>

