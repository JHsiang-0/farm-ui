<template>
  <!--
    统计徽章组件 - 响应式设计
    用于 DashboardHeader 中的状态统计展示
    特点：
    1. 响应式尺寸：根据屏幕大小自动调整内边距和字体
    2. 悬停效果：hover 时轻微上浮
    3. 高亮模式：重要状态可添加边框强调
  -->
  <div
    class="flex items-center gap-1 px-2 py-1 rounded-full transition-all cursor-default select-none shrink-0 hover:-translate-y-0.5"
    :class="[
      bgClass,
      { 'ring-1': highlight }
    ]"
  >
    <!-- 图标容器 -->
    <div
      class="flex items-center justify-center w-5 h-5 rounded-full text-white"
      :class="iconBgClass"
    >
      <!-- 动态图标组件 -->
      <component
        :is="iconComponent || defaultIcon"
        class="w-3.5 h-3.5"
        v-if="iconComponent || iconType"
      />
    </div>

    <!-- 标签和计数 -->
    <div class="flex items-center gap-1">
      <span class="text-xs text-gray-500 font-medium hidden sm:inline">{{ label }}</span>
      <span class="text-sm font-bold text-gray-900 text-center min-w-4">{{ count || 0 }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  CircleCheck,
  CircleCheckFilled,
  VideoPause,
  CircleClose,
  Warning
} from '@element-plus/icons-vue'

defineOptions({ name: 'StatBadge' })

// ============================================
// Props
// ============================================

const props = defineProps({
  /** 计数值 */
  count: {
    type: Number,
    default: 0
  },
  /** 标签文本 */
  label: {
    type: String,
    required: true
  },
  /** 背景样式类 */
  bgClass: {
    type: String,
    default: 'bg-gradient-to-r from-gray-100 to-gray-200'
  },
  /** 图标背景样式类 */
  iconBgClass: {
    type: String,
    default: 'bg-gray-600'
  },
  /** 图标组件（自定义图标） */
  iconComponent: {
    type: [Object, String],
    default: null
  },
  /** 图标类型（预设图标） */
  iconType: {
    type: String,
    default: null,
    validator: (value) => {
      return ['circle-check', 'circle-check-filled', 'video-pause', 'circle-close', 'warning'].includes(value)
    }
  },
  /** 是否高亮显示 */
  highlight: {
    type: Boolean,
    default: false
  },
  /** 高亮边框颜色类 */
  highlightRing: {
    type: String,
    default: ''
  }
})

// ============================================
// Computed
// ============================================

/** 根据图标类型返回对应的图标组件 */
const defaultIcon = computed(() => {
  const iconMap = {
    'circle-check': CircleCheck,
    'circle-check-filled': CircleCheckFilled,
    'video-pause': VideoPause,
    'circle-close': CircleClose,
    'warning': Warning
  }
  return iconMap[props.iconType] || null
})

/** 组合高亮样式类 */
const highlightClass = computed(() => {
  if (!props.highlight || !props.highlightRing) return ''
  return `ring-1 ${props.highlightRing}`
})
</script>

<style scoped>
/* 过渡动画 */
.stat-badge {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 移动端优化 */
@media (max-width: 767px) {
  .stat-badge {
    padding: 0.25rem 0.5rem;
  }

  .stat-badge .icon-container {
    width: 1.25rem;
    height: 1.25rem;
  }

  .stat-badge .icon-container :deep(svg) {
    width: 0.75rem;
    height: 0.75rem;
  }
}

/* 打印样式优化 */
@media print {
  .stat-badge {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
</style>
