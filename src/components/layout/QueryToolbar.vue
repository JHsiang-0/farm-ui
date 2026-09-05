<template>
  <section class="app-query-toolbar" :aria-label="label">
    <div class="app-query-toolbar__fields">
      <slot />
    </div>
    <div v-if="$slots.actions" class="app-query-toolbar__actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<script setup>
defineOptions({ name: 'QueryToolbar' })

defineProps({
  label: { type: String, default: '查询条件' }
})
</script>

