import { h } from 'vue'

/** 将 TDesign 图标组件转换为组件所需的 TNode 渲染函数。 */
export const renderIcon = (Icon) => () => h(Icon)
