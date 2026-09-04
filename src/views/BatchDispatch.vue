<template>
  <div class="batch-dispatch-page">
    <div class="page-header">
      <div>
        <h1>批量手动派发</h1>
        <p>先选择文件和打印机生成预览，确认后才会创建任务或启动打印。</p>
      </div>
      <t-button variant="outline" @click="loadResources" :loading="loadingResources">刷新资源</t-button>
    </div>

    <t-card class="panel" title="批量上传">
      <h2>批量上传</h2>
      <p class="hint">支持多个 .gcode、.g、.3mf、.stl 文件；上传结果按文件分别返回。</p>
      <t-upload theme="file" multiple :auto-upload="false" accept=".gcode,.g,.3mf,.stl"
        :files="uploadFiles" @select-change="handleFileChange" />
      <t-space class="mt-3">
        <t-button theme="primary" :loading="uploading" :disabled="!uploadFiles.length" @click="uploadSelected">
          {{ uploading ? '上传中…' : '批量上传' }}
        </t-button>
        <t-button v-if="uploading" variant="outline" @click="cancelUpload">取消上传</t-button>
      </t-space>
      <t-alert v-if="uploadResult" class="mt-3" :theme="uploadResult.failureCount ? 'warning' : 'success'"
        :title="`上传完成：成功 ${uploadResult.successCount ?? 0} 个，失败 ${uploadResult.failureCount ?? 0} 个`"
        :closable="false">
        <template #operation>
          <t-button v-if="retryableUploadFiles.length" variant="text" size="small" @click="retryFailedUploads">
            重试失败项（{{ retryableUploadFiles.length }}）
          </t-button>
        </template>
      </t-alert>
    </t-card>

    <div class="selection-grid">
      <t-card class="panel" :title="`选择文件（${selectedFileIds.length}）`">
        <t-checkbox-group v-model="selectedFileIds" class="selection-group">
          <t-checkbox v-for="file in files" :key="file.id" :value="file.id" class="selection-row">
            <span>{{ file.originalName || file.fileName }}</span>
            <small>{{ file.id }}</small>
          </t-checkbox>
        </t-checkbox-group>
        <t-empty v-if="!files.length" description="暂无文件，请先批量上传或刷新。" />
      </t-card>

      <t-card class="panel" :title="`选择打印机（${selectedPrinterIds.length}）`">
        <t-checkbox-group v-model="selectedPrinterIds" class="selection-group">
          <t-checkbox v-for="printer in printers" :key="printer.id" :value="printer.id" class="selection-row">
            <span>{{ printer.name }}</span>
            <small>{{ printer.ipAddress }} · {{ printer.status }}</small>
          </t-checkbox>
        </t-checkbox-group>
        <t-empty v-if="!printers.length" description="暂无打印机，请先添加设备。" />
      </t-card>
    </div>

    <t-card class="panel options-panel">
      <t-form layout="inline">
        <t-form-item label="分配策略">
          <t-select v-model="strategy" class="option-select">
            <t-option value="ONE_TO_ONE" label="一文件一打印机" />
            <t-option value="ROUND_ROBIN" label="轮询分配" />
            <t-option value="AUTO_MATCH" label="本次智能匹配" />
          </t-select>
        </t-form-item>
        <t-form-item label="确认后的动作">
          <t-select v-model="action" class="option-select">
            <t-option value="UPLOAD_ONLY" label="仅上传到打印机" />
            <t-option value="QUEUE" label="创建排队任务" />
            <t-option value="START_AFTER_CONFIRM" label="安全确认后启动" />
          </t-select>
        </t-form-item>
      </t-form>
      <t-button class="mt-4" theme="primary" :loading="previewing" @click="preview">
        {{ previewing ? '生成中…' : '生成派发预览' }}
      </t-button>
    </t-card>

    <t-card v-if="previewData" class="panel" title="预览结果">
      <p class="hint">请求 {{ previewData.requestId }} · 计划 {{ previewData.planId }} · 版本 {{ previewData.version }} · 动作 {{ previewData.action || action }}。</p>
      <t-alert v-if="previewSuggestions.length" class="mb-3" theme="info" title="分配建议" :closable="false">
        <div v-for="suggestion in previewSuggestions" :key="suggestion.itemId || suggestion.message">
          {{ suggestion.message || suggestion.reasonCode || suggestion }}
        </div>
      </t-alert>
      <t-alert v-if="previewExpired" class="mb-3" theme="warning" title="预览已过期，请重新生成" :closable="false" />
      <t-alert v-if="previewData.conflicts?.length" class="mb-3" theme="warning" title="存在不可分配冲突" :closable="false">
        <div v-for="conflict in previewData.conflicts" :key="conflict.itemId || conflict.code || conflict.message">
          {{ conflict.message || conflict.reasonCode || conflict.code || '资源冲突' }}
        </div>
      </t-alert>
      <div v-for="item in previewData.items || []" :key="item.itemId || `${item.fileId}-${item.printerId}`" class="preview-row">
        <span>文件 {{ item.fileId }} → 打印机 {{ item.printerId || '未分配' }}</span>
        <t-tag :theme="item.canExecute ? 'success' : 'danger'" variant="light">
          {{ item.message || item.reasonCode || (item.canExecute ? '可执行' : '存在冲突') }}
        </t-tag>
      </div>
      <t-button theme="primary" :disabled="previewExpired || confirming || confirmData || !executableItemIds.length" :loading="confirming" @click="confirm">
        {{ confirming ? '执行中…' : `确认执行（${executableItemIds.length}项）` }}
      </t-button>
      <t-alert v-if="confirmData" class="mt-3" theme="info" :title="`执行完成：计划状态 ${confirmData.planStatus || confirmData.status || '已处理'}`" :closable="false">
        成功 {{ confirmSuccessCount }} 项，失败 {{ confirmFailureCount }} 项
        <span v-if="confirmData.repeated">（重复确认已返回原结果）</span>
      </t-alert>
      <t-table v-if="confirmData?.items?.length" class="mt-3" :data="confirmData.items" :columns="confirmColumns"
        row-key="itemId" bordered size="small">
        <template #status="{ row }">
          <t-tag :theme="resultTheme(row)" variant="light">{{ row.status }}</t-tag>
        </template>
        <template #message="{ row }">
          {{ row.message || row.errorCode || '—' }}
        </template>
        <template #retryable="{ row }">
          {{ row.retryable ? '是' : '否' }}
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message, confirmMessage } from '@/utils/message'
import { batchUploadFiles } from '@/api/printFile'
import { getFileList } from '@/api/printFile'
import { getPrinterList } from '@/api/printer'
import { previewBatchDispatch, confirmBatchDispatch } from '@/api/job'
import { createBatchPreviewRequest, normalizeBatchConfirmResult } from '@/utils/batchDispatch'
import { useJobStore } from '@/stores/jobStore'

const route = useRoute()
const jobStore = useJobStore()
const files = ref([])
const printers = ref([])
const selectedFileIds = ref([])
const selectedPrinterIds = ref([])
const uploadFiles = ref([])
const uploadResult = ref(null)
const lastBatchUploadFiles = ref([])
const uploadController = ref(null)
const previewData = ref(null)
const confirmData = ref(null)
const uploading = ref(false)
const loadingResources = ref(false)
const previewing = ref(false)
const confirming = ref(false)
const previewExpired = ref(false)
const previewExpiresAt = ref(null)
const strategy = ref('ONE_TO_ONE')
const action = ref('QUEUE')
let previewExpiryTimer = null

const executableItemIds = computed(() => (previewData.value?.items || [])
  .filter(item => item.canExecute)
  .map(item => item.itemId)
  .filter(itemId => itemId !== undefined && itemId !== null))

const retryableUploadFiles = computed(() => (uploadResult.value?.items || [])
  .filter(item => item.retryable && lastBatchUploadFiles.value[item.index])
  .map(item => lastBatchUploadFiles.value[item.index]))

const previewSuggestions = computed(() => previewData.value?.suggestions || [])
const confirmSuccessCount = computed(() => (confirmData.value?.items || []).filter(item => item.success).length)
const confirmFailureCount = computed(() => (confirmData.value?.items || []).filter(item => !item.success).length)
const confirmColumns = [
  { colKey: 'fileId', title: '文件 ID', width: 120 },
  { colKey: 'printerId', title: '打印机 ID', width: 120 },
  { colKey: 'jobId', title: '任务 ID', width: 120 },
  { colKey: 'status', title: '状态', width: 120 },
  { colKey: 'message', title: '说明' },
  { colKey: 'retryable', title: '可重试', width: 100 }
]

function resultTheme(item) {
  return item.success ? 'success' : 'danger'
}

function stopPreviewExpiryTimer() {
  if (previewExpiryTimer) {
    clearTimeout(previewExpiryTimer)
    previewExpiryTimer = null
  }
}

function startPreviewExpiryTimer(expiresAt) {
  stopPreviewExpiryTimer()
  const expires = Date.parse(expiresAt || '')
  if (!Number.isFinite(expires)) {
    previewExpired.value = false
    return
  }
  const update = () => {
    previewExpired.value = Date.now() >= expires
    if (!previewExpired.value) previewExpiryTimer = setTimeout(update, 1000)
  }
  update()
}

function invalidatePreview() {
  previewData.value = null
  confirmData.value = null
  previewExpiresAt.value = null
  previewExpired.value = false
  stopPreviewExpiryTimer()
}

function queryIds(value) {
  if (!value) return []
  return String(value).split(',').map(item => item.trim()).filter(Boolean)
}

async function loadResources() {
  loadingResources.value = true
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
  } finally {
    loadingResources.value = false
  }
}

function handleFileChange(files) {
  uploadFiles.value = (Array.isArray(files) ? files : [])
    .map(file => file?.raw || file)
    .filter(Boolean)
  uploadResult.value = null
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
  invalidatePreview()
  const previewRequest = createBatchPreviewRequest({
    fileIds: selectedFileIds.value,
    printerIds: selectedPrinterIds.value,
    strategy: strategy.value,
    action: action.value
  })
  try {
    const response = await previewBatchDispatch(previewRequest)
    previewData.value = response?.data ? { ...response.data, requestId: previewRequest.requestId } : null
    previewExpiresAt.value = previewData.value?.expiresAt || null
    startPreviewExpiryTimer(previewExpiresAt.value)
  } catch (error) {
    console.error('生成批量派发预览失败:', error)
    message.error(error?.message || '生成预览失败')
  } finally {
    previewing.value = false
  }
}

async function confirm() {
  if (confirming.value || confirmData.value || !previewData.value || previewExpired.value || !executableItemIds.value.length) {
    message.warning(previewExpired.value ? '预览已过期，请重新生成' : '当前没有可执行的预览项')
    return
  }
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
    confirmData.value = normalizeBatchConfirmResult(response?.data)
    jobStore.applyBatchConfirmResults(confirmData.value)
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

watch([selectedFileIds, selectedPrinterIds, strategy, action], invalidatePreview, { deep: true })
onUnmounted(stopPreviewExpiryTimer)
</script>

<style scoped>
.batch-dispatch-page { padding: 24px; height: 100%; overflow: auto; background: #f7f8fa; color: #1f2937; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
h1, h2 { margin: 0 0 8px; }
h1 { font-size: 24px; }
h2 { font-size: 17px; }
.page-header p, .hint { color: #6b7280; margin: 0 0 12px; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.selection-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.selection-row, .preview-row { display: flex; gap: 10px; align-items: center; padding: 9px 0; border-bottom: 1px solid #f0f0f0; }
.selection-row span { flex: 1; }
small { color: #9ca3af; }
.options-panel { display: flex; gap: 18px; align-items: end; flex-wrap: wrap; }
label { display: flex; flex-direction: column; gap: 6px; }
select { min-width: 180px; padding: 7px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; }
button { border: 0; border-radius: 4px; padding: 8px 14px; cursor: pointer; }
button:disabled { opacity: .55; cursor: not-allowed; }
.primary-button { color: #fff; background: #2563eb; margin: 8px 8px 0 0; }
.secondary-button { color: #374151; background: #e5e7eb; }
.result-box { margin-top: 12px; padding: 10px; background: #eff6ff; border-radius: 4px; line-height: 1.8; }
.ok { color: #15803d; }
.error { color: #b91c1c; }
@media (max-width: 800px) { .selection-grid { grid-template-columns: 1fr; } .page-header { gap: 12px; flex-direction: column; } }
</style>
