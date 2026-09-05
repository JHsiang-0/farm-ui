<template>
  <section class="app-data-region" :aria-label="label">
    <div v-if="$slots.header" class="app-data-region__header">
      <slot name="header" />
    </div>
    <div class="app-data-region__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="app-data-region__footer">
      <slot name="footer" />
    </div>
  </section>
</template>

<script setup>
defineOptions({ name: 'DataRegion' })

defineProps({
  label: { type: String, default: '数据区域' }
})
</script>

