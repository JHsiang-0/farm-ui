<script setup>
import { computed, provide, shallowRef, useAttrs } from 'vue'
import { Table } from 'tdesign-vue-next'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  height: { type: [String, Number], default: undefined },
  rowKey: { type: String, default: 'id' }
})

const emit = defineEmits(['row-click', 'selection-change'])
const attrs = useAttrs()
const registeredColumns = shallowRef([])

provide('farm-table-register-column', column => {
  registeredColumns.value = [...registeredColumns.value, column]
  return () => {
    registeredColumns.value = registeredColumns.value.filter(item => item !== column)
  }
})

const columns = computed(() => registeredColumns.value.map((column, index) => {
  if (column.type === 'selection') {
    return { colKey: 'row-select', type: 'multiple', width: column.width || 48, fixed: column.fixed }
  }

  return {
    colKey: column.prop || `column-${index}`,
    title: column.label,
    width: column.width,
    minWidth: column.minWidth,
    align: column.align,
    fixed: column.fixed,
    ellipsis: column.showOverflowTooltip,
    cell: column.slot
      ? (_h, { row, rowIndex }) => {
        const content = column.slot({ row, $index: rowIndex, rowIndex })
        // 条件插槽在更新期间可能返回 false/true，过滤掉非 VNode 值，避免 TDesign
        // 在 TR 重绘时尝试创建非法 VNode。
        return Array.isArray(content) ? content.filter(Boolean) : content
      }
      : undefined
  }
}))

const tableAttrs = computed(() => {
  const {
    class: className,
    style,
    rowClassName,
    'row-class-name': legacyRowClassName,
    'header-cell-style': _headerCellStyle,
    headerCellStyle: _headerCellStyleCamel,
    'highlight-current-row': highlightCurrentRow,
    highlightCurrentRow: highlightCurrentRowCamel,
    border,
    bordered,
    stripe,
    ...rest
  } = attrs
  void _headerCellStyle
  void _headerCellStyleCamel
  return {
    ...rest,
    class: className,
    style,
    data: props.data,
    columns: columns.value,
    loading: props.loading,
    height: props.height,
    rowKey: props.rowKey,
    rowClassName: rowClassName || legacyRowClassName,
    activeRowType: highlightCurrentRow || highlightCurrentRowCamel ? 'single' : undefined,
    bordered: bordered ?? border,
    stripe,
    onRowClick: context => emit('row-click', context.row, context),
    onSelectChange: (keys, context) => emit('selection-change', context?.selectedRowData || keys, context)
  }
})
</script>

<template>
  <div class="td-table-adapter">
    <!-- 先让 TdTableColumn 完成注册，再挂载 TDesign Table。 -->
    <Table v-if="columns.length" v-bind="tableAttrs" />
    <!-- 保留列组件插槽，确保 TdTableColumn 在 Table 首次挂载前完成列注册。 -->
    <span class="hidden" aria-hidden="true"><slot /></span>
  </div>
</template>
