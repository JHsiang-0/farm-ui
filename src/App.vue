<template>
  <div v-cloak id="app-container">
    <router-view />
  </div>
</template>

<style>
/* ============================================
   v-cloak: 防止 Vue 未加载完成时显示内容
   ============================================ */
[v-cloak] {
  display: none !important;
}

#app-container {
  width: 100%;
  height: 100%;
}
</style>
