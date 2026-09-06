<template>
  <div class="batch-dispatch-page">
    <div class="page-header">
      <div>
        <h1>批量手动派发</h1>
        <p>先选择文件和打印机生成预览，确认后才会创建任务或启动打印。</p>
      </div>
      <button class="secondary-button" type="button" @click="loadResources">刷新资源</button>
    </div>

    <section class="panel">
      <h2>批量上传</h2>
      <p class="hint">支持多个 .gcode、.g、.3mf、.stl 文件；上传结果按文件分别返回。</p>
      <input ref="uploadInput" type="file" multiple accept=".gcode,.g,.3mf,.stl" @change="handleFileChange">
      <button class="primary-button" type="button" :disabled="uploading || !uploadFiles.length" @click="uploadSelected">
        {{ uploading ? '上传中…' : '批量上传' }}
      </button>
      <button v-if="uploading" class="secondary-button" type="button" @click="cancelUpload">取消上传</button>
      <div v-if="uploadResult" class="result-box">
        上传完成：成功 {{ uploadResult.successCount ?? 0 }} 个，失败 {{ uploadResult.failureCount ?? 0 }} 个
        <button v-if="retryableUploadFiles.length" class="secondary-button" type="button" @click="retryFailedUploads">
          重试失败项（{{ retryableUploadFiles.length }}）
        </button>
      </div>
    </section>

    <div class="selection-grid">
      <section class="panel">
        <h2>选择文件（{{ selectedFileIds.length }}）</h2>
        <label v-for="file in files" :key="file.id" class="selection-row">
          <input v-model="selectedFileIds" type="checkbox" :value="file.id">
          <span>{{ file.originalName || file.fileName }}</span>
          <small>{{ file.id }}</small>
        </label>
        <p v-if="!files.length" class="hint">暂无文件，请先批量上传或刷新。</p>
      </section>

      <section class="panel">
        <h2>选择打印机（{{ selectedPrinterIds.length }}）</h2>
        <label v-for="printer in printers" :key="printer.id" class="selection-row">
          <input v-model="selectedPrinterIds" type="checkbox" :value="printer.id">
          <span>{{ printer.name }}</span>
          <small>{{ printer.ipAddress }} · {{ printer.status }}</small>
        </label>
        <p v-if="!printers.length" class="hint">暂无打印机，请先添加设备。</p>
      </section>
    </div>

    <section class="panel options-panel">
      <label>分配策略
        <select v-model="strategy">
          <option value="ONE_TO_ONE">一文件一打印机</option>
          <option value="ROUND_ROBIN">轮询分配</option>
          <option value="AUTO_MATCH">按资源自动匹配（仅本次确认）</option>
        </select>
      </label>
      <label>确认后的动作
        <select v-model="action">
          <option value="UPLOAD_ONLY">仅上传到打印机</option>
          <option value="QUEUE">创建排队任务</option>
          <option value="START_AFTER_CONFIRM">安全确认后启动</option>
        </select>
      </label>
      <button class="primary-button" type="button" :disabled="previewing" @click="preview">
        {{ previewing ? '生成中…' : '生成派发预览' }}
      </button>
    </section>

    <section v-if="previewData" class="panel">
      <h2>预览结果</h2>
      <p class="hint">计划 {{ previewData.planId }} · 版本 {{ previewData.version }} · 请确认资源和动作后执行。</p>
      <div v-for="item in previewData.items || []" :key="item.itemId || `${item.fileId}-${item.printerId}`" class="preview-row">
        <span>文件 {{ item.fileId }} → 打印机 {{ item.printerId || '未分配' }}</span>
        <span :class="item.canExecute ? 'ok' : 'error'">{{ item.message || item.reasonCode || (item.canExecute ? '可执行' : '存在冲突') }}</span>
      </div>
      <button class="primary-button" type="button" :disabled="confirming || !executableItemIds.length" @click="confirm">
        {{ confirming ? '执行中…' : `确认执行（${executableItemIds.length}项）` }}
      </button>
      <div v-if="confirmData" class="result-box">
        执行完成：计划状态 {{ confirmData.planStatus || confirmData.status || '已处理' }}
        <div v-for="item in confirmData.items || []" :key="item.itemId || `${item.fileId}-${item.printerId}`">
          文件 {{ item.fileId }}：{{ item.message || item.status }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message, confirmMessage } from '@/utils/message'
import { batchUploadFiles } from '@/api/printFile'
import { getFileList } from '@/api/printFile'
import { getPrinterList } from '@/api/printer'
import { previewBatchDispatch, confirmBatchDispatch } from '@/api/job'

const route = useRoute()
const files = ref([])
const printers = ref([])
const selectedFileIds = ref([])
const selectedPrinterIds = ref([])
const uploadFiles = ref([])
const uploadInput = ref(null)
const uploadResult = ref(null)
const lastBatchUploadFiles = ref([])
const uploadController = ref(null)
const previewData = ref(null)
const confirmData = ref(null)
const uploading = ref(false)
const previewing = ref(false)
const confirming = ref(false)
const strategy = ref('ONE_TO_ONE')
const action = ref('QUEUE')

const executableItemIds = computed(() => (previewData.value?.items || [])
  .filter(item => item.canExecute)
  .map(item => item.itemId)
  .filter(itemId => itemId !== undefined && itemId !== null))

const retryableUploadFiles = computed(() => (uploadResult.value?.items || [])
  .filter(item => item.retryable && lastBatchUploadFiles.value[item.index])
  .map(item => lastBatchUploadFiles.value[item.index]))

function queryIds(value) {
  if (!value) return []
  return String(value).split(',').map(item => item.trim()).filter(Boolean)
}

async function loadResources() {
  try {
    const [fileResponse, printerResponse] = await Promise.all([
      getFileList({ pageNum: 1, pageSize: 100 }),
      getPrinterList({ pageNum: 1, pageSize: 100 })
    ])
    files.value = (fileResponse?.data?.records || []).filter(file => !file.folder)
    printers.value = printerResponse?.data?.records || []
  } catch (error) {
    console.error('加载批量派发资源失败:', error)
    message.error('加载文件或打印机失败')
  }
}

function handleFileChange(event) {
  uploadFiles.value = Array.from(event.target.files || [])
}

async function uploadSelected() {
  uploading.value = true
  lastBatchUploadFiles.value = [...uploadFiles.value]
  uploadController.value = new AbortController()
  try {
    const response = await batchUploadFiles(
      uploadFiles.value,
      null,
      undefined,
      { signal: uploadController.value.signal }
    )
    uploadResult.value = response?.data || {}
    message.success('批量上传处理完成')
    uploadFiles.value = []
    if (uploadInput.value) uploadInput.value.value = ''
    await loadResources()
  } catch (error) {
    console.error('批量上传失败:', error)
    if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
      message.info('批量上传已取消')
    } else {
      message.error(error?.message || '批量上传失败')
    }
  } finally {
    uploadController.value = null
    uploading.value = false
  }
}

function cancelUpload() {
  uploadController.value?.abort()
}

async function retryFailedUploads() {
  if (!retryableUploadFiles.value.length || uploading.value) return
  uploadFiles.value = retryableUploadFiles.value
  await uploadSelected()
}

async function preview() {
  if (!selectedFileIds.value.length || !selectedPrinterIds.value.length) {
    message.warning('请至少选择一个文件和一台打印机')
    return
  }
  previewing.value = true
  confirmData.value = null
  try {
    const response = await previewBatchDispatch({
      fileIds: selectedFileIds.value,
      printerIds: selectedPrinterIds.value,
      strategy: strategy.value,
      action: action.value
    })
    previewData.value = response?.data || null
  } catch (error) {
    console.error('生成批量派发预览失败:', error)
    message.error(error?.message || '生成预览失败')
  } finally {
    previewing.value = false
  }
}

async function confirm() {
  try {
    await confirmMessage(
      '确认后将按预览结果创建任务或上传/启动，请确认打印机和文件均正确。',
      '确认批量派发',
      { confirmButtonText: '确认执行', cancelButtonText: '返回检查', type: 'warning' }
    )
  } catch {
    return
  }

  confirming.value = true
  try {
    const response = await confirmBatchDispatch({
      planId: previewData.value.planId,
      version: previewData.value.version,
      itemIds: executableItemIds.value,
      confirmationToken: previewData.value.confirmationToken
    })
    confirmData.value = response?.data || {}
    message.success('批量派发已处理')
    await loadResources()
  } catch (error) {
    console.error('确认批量派发失败:', error)
    message.error(error?.message || '确认执行失败，请刷新预览')
  } finally {
    confirming.value = false
  }
}

onMounted(async () => {
  await loadResources()
  selectedFileIds.value = queryIds(route.query.fileIds)
})
</script>

<style scoped>
.batch-dispatch-page { padding: 24px; height: 100%; overflow: auto; background: var(--app-page-background); color: var(--app-text-primary); }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
h1, h2 { margin: 0 0 8px; }
h1 { font-size: 24px; }
h2 { font-size: 17px; }
.page-header p, .hint { color: var(--app-text-secondary); margin: 0 0 12px; }
.panel { background: #fff; border: 1px solid var(--app-border); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.selection-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.selection-row, .preview-row { display: flex; gap: 10px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--app-border); }
.selection-row span { flex: 1; }
small { color: var(--app-text-placeholder); }
.options-panel { display: flex; gap: 18px; align-items: end; flex-wrap: wrap; }
label { display: flex; flex-direction: column; gap: 6px; }
select { min-width: 180px; padding: 7px; border: 1px solid var(--app-border-strong); border-radius: 4px; background: #fff; }
button { border: 0; border-radius: 4px; padding: 8px 14px; cursor: pointer; }
button:disabled { opacity: .55; cursor: not-allowed; }
.primary-button { color: #fff; background: var(--app-primary); margin: 8px 8px 0 0; }
.secondary-button { color: var(--app-text-primary); background: var(--app-border); }
.result-box { margin-top: 12px; padding: 10px; background: var(--app-primary-light); border-radius: 4px; line-height: 1.8; }
.ok { color: var(--app-success-active); }
.error { color: var(--app-danger-active); }
@media (max-width: 800px) { .selection-grid { grid-template-columns: 1fr; } .page-header { gap: 12px; flex-direction: column; } }
</style>
