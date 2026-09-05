import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/views/PrinterManage.vue', import.meta.url), 'utf8')
const detailSource = fs.readFileSync(new URL('../src/components/device/DeviceDetailDrawer.vue', import.meta.url), 'utf8')
const tableAdapterSource = fs.readFileSync(new URL('../src/components/TdTable.vue', import.meta.url), 'utf8')

test('打印机中心使用正式名称和状态筛选契约', () => {
  assert.match(source, /v-model="keyword"/)
  assert.match(source, /name: keyword\.value\.trim\(\)/)
  assert.match(source, /Object\.values\(PRINTER_STATUS\)/)
  assert.doesNotMatch(source, /statusFilterConfig = \{[\s\S]*ATTENTION/)
  assert.match(source, /status: activeStatusFilterKey\.value/)
})

test('打印机中心覆盖未分配设备、详情分析和正式控制入口', () => {
  assert.match(source, /getUnallocatedPrinters/)
  assert.match(source, /未分配设备抽屉/)
  assert.match(source, /getPrinterStatusHistory/)
  assert.match(source, /getPrinterStatistics/)
  assert.match(source, /<DeviceDetailDrawer/)
  assert.match(detailSource, /handleAction\('pause'\)/)
  assert.match(detailSource, /handleAction\('resume'\)/)
  assert.match(detailSource, /handleAction\('cancel'\)/)
  assert.match(detailSource, /emergency-stop/)
  assert.match(detailSource, /confirmSafe/)
  assert.match(detailSource, /<t-empty v-else-if="detailError" type="fail"/)
  assert.doesNotMatch(detailSource, /<t-result/)
})

test('打印机删除显示关联任务风险并保留逐项执行状态', () => {
  assert.match(source, /getDeleteMessage/)
  assert.match(source, /deletingIds\.includes\(scope\.row\.id\)/)
  assert.match(source, /删除可能被服务端拒绝/)
})

test('表格适配层参与页面高度链并把滚动交给 TDesign Table', () => {
  assert.match(tableAdapterSource, /class="td-table-adapter" :class="attrs\.class" :style="attrs\.style"/)
  assert.match(tableAdapterSource, /\.td-table-adapter[\s\S]*min-height: 0/)
  assert.match(tableAdapterSource, /\.td-table-adapter :deep\(\.t-table\)[\s\S]*flex: 1 1 0%/)
})
