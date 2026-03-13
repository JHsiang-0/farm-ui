<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-temperature">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    <path d="M12 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor" opacity="0.3" />
  </svg>
</template>

<script setup>
defineOptions({ name: 'IconTemperature' })
</script>

<style scoped>
.icon-temperature {
  width: 1em;
  height: 1em;
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
