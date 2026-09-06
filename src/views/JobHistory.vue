<template>
  <div class="app-page-shell app-page-background job-history-page">
    <header class="job-history-header">
      <h1 class="app-route-title">打印历史记录</h1>
      <div class="job-history-header__actions">
        <t-button variant="outline" :icon="renderIcon(Refresh)" :loading="loading" @click="handleQuery">刷新</t-button>
        <t-button theme="success" :icon="renderIcon(Add)" @click="goToCreateJob">新建打印任务</t-button>
      </div>
    </header>

    <section class="job-history-card">
      <div class="job-history-status-row">
        <nav class="job-history-status-tabs" aria-label="打印任务状态">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            class="job-history-status-tab"
            :class="{ 'job-history-status-tab--active': activeStatusTab === tab.value }"
            @click="handleStatusTabChange(tab.value)"
          >
            <span v-if="tab.warning" class="job-history-status-tab__dot" />
            {{ tab.label }}
            <span class="job-history-status-tab__count">{{ tab.count }}</span>
          </button>
        </nav>
        <t-button class="job-history-more" variant="text" shape="square" aria-label="更多筛选">
          <More :size="18" />
        </t-button>
      </div>

      <div class="job-history-filter-bar">
        <div class="job-history-filter-bar__main">
          <t-input
            v-model="queryForm.keyword"
            class="job-history-search"
            placeholder="快速过滤任务：输入任务ID、文件或设备..."
            clearable
            @keyup.enter="handleQuery"
          >
            <template #prefixIcon><Search :size="16" /></template>
            <template #suffix><span class="job-history-shortcut">Ctrl+K</span></template>
          </t-input>

          <div class="job-history-filter-field">
            <span class="job-history-filter-field__label">任务状态:</span>
            <t-select v-model="queryForm.status" class="job-history-status-select" placeholder="全部运行状态" clearable @change="handleQuery">
              <t-option label="全部运行状态" value="" />
              <t-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
            </t-select>
          </div>

          <div class="job-history-filter-field">
            <span class="job-history-filter-field__label">时间范围:</span>
            <t-date-range-picker
              v-model="queryForm.dateRange"
              class="job-history-date-range"
              :placeholder="['开始日期', '结束日期']"
              separator="至"
              value-type="YYYY-MM-DD HH:mm:ss"
              :default-time="['00:00:00', '23:59:59']"
              clearable
              @change="handleQuery"
            />
          </div>

          <t-button variant="outline" @click="handleReset">重置</t-button>
        </div>

        <div class="job-history-filter-bar__summary">
          <t-button variant="outline" size="small" disabled :icon="renderIcon(Delete)">批量操作</t-button>
          <span class="job-history-summary-divider" />
          <span>总计 <strong>{{ pagination.total }}</strong> 单</span>
          <span class="job-history-summary-divider" />
          <span>已选择 <strong>{{ selectedJobIds.length }}</strong> 项</span>
          <div class="job-history-view-toggle" role="group" aria-label="视图切换">
            <button
              type="button"
              aria-label="列表视图"
              :class="{ 'job-history-view-toggle__button--active': viewMode === 'list' }"
              @click="viewMode = 'list'"
            >
              <List :size="16" />
            </button>
            <button
              type="button"
              aria-label="网格视图"
              :class="{ 'job-history-view-toggle__button--active': viewMode === 'grid' }"
              @click="viewMode = 'grid'"
            >
              <Grid :size="16" />
            </button>
          </div>
        </div>
      </div>

      <div class="job-history-content">
        <div v-if="loading" class="job-history-state">
          <Refresh :size="32" class="is-loading" />
          <span>正在加载打印历史...</span>
        </div>
        <div v-else-if="tableData.length === 0" class="job-history-state">
          <Document :size="48" />
          <span>暂无打印历史记录</span>
        </div>

        <div v-else-if="viewMode === 'list'" class="job-history-table-scroll">
          <TdTable
            class="job-history-table"
            :data="tableData"
            :loading="loading"
            row-key="id"
            @selection-change="handleSelectionChange"
            @row-click="openTaskDetail"
          >
            <TdTableColumn type="selection" width="44" align="center" />
            <TdTableColumn label="任务ID" width="92" align="center">
              <template #default="scope"><span class="job-history-id">#{{ scope.row.id }}</span></template>
            </TdTableColumn>
            <TdTableColumn label="关联文件 / 模型" min-width="210">
              <template #default="scope">
                <div class="job-history-file-cell">
                  <span class="job-history-file-cell__icon"><Document :size="17" /></span>
                  <div>
                    <strong :title="getJobFileName(scope.row)">{{ getJobFileName(scope.row) }}</strong>
                    <small>ID: {{ scope.row.fileId ?? '-' }}</small>
                  </div>
                </div>
              </template>
            </TdTableColumn>
            <TdTableColumn label="分配设备" min-width="160">
              <template #default="scope">
                <div class="job-history-device-cell">
                  <span class="job-history-device-cell__dot" :class="getDeviceDotClass(scope.row.status)" />
                  <div>
                    <strong>{{ getPrinterName(scope.row) }}</strong>
                    <small>#{{ scope.row.printerId ?? '-' }} · {{ scope.row.machineModel || '通用设备' }}</small>
                  </div>
                </div>
              </template>
            </TdTableColumn>
            <TdTableColumn label="打印状态" width="112" align="center">
              <template #default="scope">
                <span class="job-history-status" :class="getStatusClass(scope.row.status)"><i />{{ getStatusLabel(scope.row.status) }}</span>
              </template>
            </TdTableColumn>
            <TdTableColumn label="优先级" width="76" align="center">
              <template #default="scope">
                <span class="job-history-priority" :class="`job-history-priority--${getPriorityType(scope.row.priority)}`">{{ formatPriority(scope.row.priority) }}</span>
              </template>
            </TdTableColumn>
            <TdTableColumn label="进度 / 层数" width="158">
              <template #default="scope">
                <div class="job-history-progress">
                  <div class="job-history-progress__summary">
                    <span>{{ formatProgress(scope.row.progress) }}</span>
                    <small>{{ getLayerLabel(scope.row) }}</small>
                  </div>
                  <div class="job-history-progress__track">
                    <span class="job-history-progress__fill" :class="getProgressClass(scope.row.status)" :style="{ width: `${normalizeProgress(scope.row.progress)}%` }" />
                  </div>
                </div>
              </template>
            </TdTableColumn>
            <TdTableColumn label="耗材类型" width="112" align="center">
              <template #default="scope"><span class="job-history-material" :class="getMaterialClass(scope.row.materialType)">Ext {{ scope.row.materialType || 'PLA' }}</span></template>
            </TdTableColumn>
            <TdTableColumn label="创建时间" width="166">
              <template #default="scope"><span class="job-history-date"><Clock :size="14" />{{ formatDateTime(scope.row.createdAt) }}</span></template>
            </TdTableColumn>
            <TdTableColumn label="结束时间" width="166">
              <template #default="scope"><span class="job-history-date"><Calendar :size="14" />{{ formatDateTime(scope.row.completedAt) }}</span></template>
            </TdTableColumn>
            <TdTableColumn label="报错原因" min-width="150">
              <template #default="scope">
                <span v-if="scope.row.errorReason" class="job-history-error">{{ scope.row.errorReason }}</span>
                <span v-else class="job-history-muted">-</span>
              </template>
            </TdTableColumn>
            <TdTableColumn label="操作" width="116" align="right" fixed="right">
              <template #default="scope">
                <div class="job-history-actions">
                  <t-button size="small" variant="text" @click.stop="openTaskDetail(scope.row)">详情</t-button>
                  <t-button v-if="scope.row.status === 'FAILED'" size="small" theme="danger" variant="text" @click.stop="handleRetry(scope.row.id)">重试</t-button>
                  <t-button v-else-if="['ASSIGNED', 'READY'].includes(scope.row.status)" size="small" variant="text" @click.stop="handleRequeue(scope.row.id)">重新排队</t-button>
                  <t-popconfirm v-if="canCancel(scope.row.status)" content="确定要取消这个任务吗？" theme="danger" @confirm="handleCancel(scope.row.id)">
                    <template #trigger><t-button size="small" theme="danger" variant="text" @click.stop>取消</t-button></template>
                  </t-popconfirm>
                </div>
              </template>
            </TdTableColumn>
          </TdTable>
        </div>

        <div v-else class="job-history-grid-view">
          <article v-for="job in tableData" :key="job.id" class="job-history-grid-card">
            <div class="job-history-grid-card__top">
              <span class="job-history-id">#{{ job.id }}</span>
              <span class="job-history-status" :class="getStatusClass(job.status)"><i />{{ getStatusLabel(job.status) }}</span>
            </div>
            <div class="job-history-grid-card__file"><Document :size="18" /><strong>{{ getJobFileName(job) }}</strong></div>
            <div class="job-history-grid-card__meta">{{ getPrinterName(job) }} · {{ job.materialType || 'PLA' }}</div>
            <div class="job-history-progress">
              <div class="job-history-progress__summary"><span>{{ formatProgress(job.progress) }}</span><small>{{ getLayerLabel(job) }}</small></div>
              <div class="job-history-progress__track"><span class="job-history-progress__fill" :class="getProgressClass(job.status)" :style="{ width: `${normalizeProgress(job.progress)}%` }" /></div>
            </div>
            <div class="job-history-grid-card__bottom"><span>{{ formatDateTime(job.createdAt) }}</span><t-button size="small" variant="text" @click="openTaskDetail(job)">详情</t-button></div>
          </article>
        </div>
      </div>

      <footer class="job-history-footer">
        <span class="job-history-footer__total">共 <strong>{{ pagination.total }}</strong> 条数据</span>
        <t-pagination
          v-model:current="pagination.pageNum"
          v-model:pageSize="pagination.pageSize"
          :total="pagination.total"
          :page-size-options="[10, 20, 50]"
          :total-content="false"
          @change="handlePaginationChange"
        />
      </footer>
    </section>

    <TaskDetailDrawer v-model="detailDrawerVisible" :task="selectedJob" @update:model-value="handleTaskDetailVisibility" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AddIcon as Add,
  CalendarIcon as Calendar,
  DeleteIcon as Delete,
  FileIcon as Document,
  GridViewIcon as Grid,
  MoreIcon as More,
  RefreshIcon as Refresh,
  SearchIcon as Search,
  TimeIcon as Clock,
  ViewListIcon as List
} from 'tdesign-icons-vue-next'
import { cancelJob, getJobPage, requeueJob, retryJob } from '@/api/job'
import { message } from '@/utils/message'
import { formatDateTime, normalizeProgress } from '@/utils/formatters'
import { renderIcon } from '@/utils/tdesign'
import TdTable from '@/components/TdTable.vue'
import TdTableColumn from '@/components/TdTableColumn.vue'
import TaskDetailDrawer from '@/components/TaskDetailDrawer.vue'

defineOptions({ name: 'JobHistory' })

const router = useRouter()
const loading = ref(false)
const tableData = ref([])
const selectedJobIds = ref([])
const viewMode = ref('list')
const activeStatusTab = ref('all')
const statusCounts = ref({})
const statusCountsLoaded = ref(false)
const detailDrawerVisible = ref(false)
const selectedJob = ref(null)
const JOB_HISTORY_DETAIL_CONTEXT_KEY = 'farm-ui:job-history-detail'

const queryForm = reactive({ keyword: '', status: '', dateRange: [], printerId: '' })
const pagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })

const statusOptions = [
  { label: '打印中', value: 'PRINTING' },
  { label: '已暂停', value: 'PAUSED' },
  { label: '排队中', value: 'QUEUED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '失败', value: 'FAILED' },
  { label: '已取消', value: 'CANCELLED' }
]

const statusTabs = computed(() => [
  { label: '全部', value: 'all', count: statusCounts.value.all ?? pagination.total },
  { label: '打印中', value: 'PRINTING', count: statusCounts.value.PRINTING ?? 0 },
  { label: '需要关注 / 异常', value: 'attention', count: statusCounts.value.attention ?? 0, warning: true },
  { label: '排队中', value: 'QUEUED', count: statusCounts.value.QUEUED ?? 0 },
  { label: '已完成', value: 'COMPLETED', count: statusCounts.value.COMPLETED ?? 0 },
  { label: '已取消', value: 'CANCELLED', count: statusCounts.value.CANCELLED ?? 0 }
])

const getStatusLabel = status => ({
  UPLOADING: '上传中',
  QUEUED: '排队中',
  ASSIGNED: '已分配待确认',
  READY: '已上传待机',
  PRINTING: '打印中',
  PAUSED: '已暂停',
  COMPLETED: '已完成',
  FAILED: '失败',
  RECONCILING: '状态核对中',
  CANCELLED: '已取消'
}[status] || status || '-')

const getStatusClass = status => `job-history-status--${String(status || '').toLowerCase()}`
const getDeviceDotClass = status => {
  if (status === 'FAILED') return 'job-history-device-cell__dot--danger'
  if (status === 'PAUSED') return 'job-history-device-cell__dot--warning'
  if (status === 'COMPLETED') return 'job-history-device-cell__dot--success'
  return 'job-history-device-cell__dot--primary'
}
const getProgressClass = status => {
  if (status === 'COMPLETED') return 'job-history-progress__fill--success'
  if (status === 'PAUSED') return 'job-history-progress__fill--warning'
  if (status === 'FAILED') return 'job-history-progress__fill--danger'
  return ''
}
const getPriorityType = priority => {
  const value = Number(priority)
  if (value >= 80) return 'danger'
  if (value >= 50) return 'warning'
  if (value >= 20) return 'primary'
  return 'default'
}
const formatPriority = priority => {
  const value = Number(priority)
  return Number.isFinite(value) ? value : '-'
}
const formatProgress = progress => `${normalizeProgress(progress).toFixed(1)}%`
const getLayerLabel = job => {
  const totalLayers = Number(job.totalLayers) > 0 ? Number(job.totalLayers) : 300
  const currentLayers = Math.round(totalLayers * normalizeProgress(job.progress) / 100)
  return `${currentLayers} / ${totalLayers} 层`
}
const getJobFileName = job => job.fileName || (job.fileId ? `文件 #${job.fileId}` : '未命名文件')
const getPrinterName = job => job.printerName || (job.printerId ? `打印机 #${job.printerId}` : '未分配设备')
const getMaterialClass = material => `job-history-material--${String(material || 'PLA').toLowerCase()}`
const canCancel = status => ['QUEUED', 'ASSIGNED', 'READY', 'PAUSED'].includes(status)

const openTaskDetail = job => {
  selectedJob.value = job
  sessionStorage.setItem(JOB_HISTORY_DETAIL_CONTEXT_KEY, String(job.id))
  detailDrawerVisible.value = true
}

const handleTaskDetailVisibility = visible => {
  if (!visible) {
    detailDrawerVisible.value = false
    selectedJob.value = null
    sessionStorage.removeItem(JOB_HISTORY_DETAIL_CONTEXT_KEY)
  }
}

const restoreTaskDetailContext = () => {
  const jobId = sessionStorage.getItem(JOB_HISTORY_DETAIL_CONTEXT_KEY)
  if (!jobId || selectedJob.value) return
  const job = tableData.value.find(item => String(item.id) === jobId)
  if (job) openTaskDetail(job)
}

const buildParams = () => {
  const params = { pageNum: pagination.pageNum, pageSize: pagination.pageSize }
  if (queryForm.keyword.trim()) params.keyword = queryForm.keyword.trim()
  if (queryForm.status) params.status = queryForm.status
  if (queryForm.printerId) params.printerId = queryForm.printerId
  if (queryForm.dateRange?.length === 2) {
    params.startTime = queryForm.dateRange[0]
    params.endTime = queryForm.dateRange[1]
  }
  return params
}

const loadStatusCounts = async () => {
  try {
    const res = await getJobPage({ pageNum: 1, pageSize: 100 })
    if (res.code === 200) {
      const records = res.data?.records || []
      const counts = records.reduce((result, job) => {
        result[job.status] = (result[job.status] || 0) + 1
        return result
      }, {})
      counts.all = res.data?.total || records.length
      counts.attention = (counts.FAILED || 0) + (counts.PAUSED || 0)
      statusCounts.value = counts
    }
  } catch (error) {
    console.error('获取状态统计失败:', error)
  } finally {
    statusCountsLoaded.value = true
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getJobPage(buildParams())
    if (res.code === 200) {
      tableData.value = res.data?.records || []
      pagination.total = res.data?.total || 0
      restoreTaskDetailContext()
    } else {
      message.error(res.message || '获取打印历史失败')
    }
  } catch (error) {
    console.error('获取打印历史记录失败:', error)
    message.error('获取打印历史记录失败')
  } finally {
    loading.value = false
  }
}

const handleQuery = async () => {
  pagination.pageNum = 1
  await fetchData()
}

const handleReset = () => {
  queryForm.keyword = ''
  queryForm.status = ''
  queryForm.dateRange = []
  queryForm.printerId = ''
  activeStatusTab.value = 'all'
  handleQuery()
}

const handleStatusTabChange = value => {
  activeStatusTab.value = value
  queryForm.status = ['PRINTING', 'QUEUED', 'COMPLETED', 'CANCELLED'].includes(value) ? value : ''
  handleQuery()
}

const handlePaginationChange = ({ current, pageSize }) => {
  pagination.pageNum = current
  pagination.pageSize = pageSize
  fetchData()
}

const handleSelectionChange = rows => {
  selectedJobIds.value = rows.map(row => row.id ?? row)
}

const handleCancel = async id => {
  try {
    await cancelJob(id)
    message.success('任务已取消')
    fetchData()
  } catch (error) {
    console.error('取消任务失败:', error)
    message.error('取消任务失败')
  }
}

const handleRetry = async id => {
  try {
    await retryJob(id)
    message.success('任务已重新加入队列')
    fetchData()
  } catch (error) {
    console.error('重试任务失败:', error)
    message.error('重试任务失败')
  }
}

const handleRequeue = async id => {
  try {
    await requeueJob(id)
    message.success('任务已重新排队')
    fetchData()
  } catch (error) {
    console.error('重新排队失败:', error)
    message.error('重新排队失败')
  }
}

const goToCreateJob = () => router.push({ name: 'files' })

const handleGlobalShortcut = event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    document.querySelector('.job-history-search input')?.focus()
  }
}

onMounted(() => {
  fetchData()
  if (!statusCountsLoaded.value) loadStatusCounts()
  window.addEventListener('keydown', handleGlobalShortcut)
})

onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalShortcut))
</script>

<style scoped>
.job-history-page { gap: 1rem; padding: 1.25rem 1.5rem; }
.job-history-header { display: flex; align-items: center; flex: 0 0 auto; justify-content: space-between; gap: 1rem; }
.job-history-header h1 { margin: 0; color: var(--app-text-primary); font-size: 1.25rem; }
.job-history-header__actions { display: flex; align-items: center; gap: 0.5rem; }
.job-history-card { display: flex; flex: 1 1 0%; flex-direction: column; width: 100%; min-width: 0; min-height: 0; overflow: hidden; border: 1px solid var(--app-border); border-radius: 0.5rem; background: #fff; box-shadow: 0 1px 2px rgb(15 23 42 / 4%); }
.job-history-status-row, .job-history-filter-bar, .job-history-footer { flex: 0 0 auto; }
.job-history-status-row { display: flex; align-items: center; justify-content: space-between; min-height: 3.75rem; padding: 0 1.25rem; border-bottom: 1px solid var(--app-surface-muted); }
.job-history-status-tabs { display: flex; align-items: stretch; align-self: stretch; min-width: 0; gap: 1.5rem; }
.job-history-status-tab { position: relative; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0 0.15rem; border: 0; background: transparent; color: var(--app-text-secondary); cursor: pointer; font-size: 0.8125rem; white-space: nowrap; }
.job-history-status-tab::after { position: absolute; right: 0; bottom: 0; left: 0; height: 2px; background: transparent; content: ''; }
.job-history-status-tab--active { color: var(--app-primary); font-weight: 600; }
.job-history-status-tab--active::after { background: var(--app-primary); }
.job-history-status-tab__count { min-width: 1.2rem; padding: 0.1rem 0.3rem; border-radius: 0.75rem; background: var(--app-surface-muted); color: var(--app-text-secondary); font-size: 0.6875rem; line-height: 1.1rem; text-align: center; }
.job-history-status-tab--active .job-history-status-tab__count { background: var(--app-primary-light); color: var(--app-primary-active); }
.job-history-status-tab__dot { width: 0.4rem; height: 0.4rem; border-radius: 50%; background: var(--app-warning); }
.job-history-more { color: var(--app-text-secondary); }
.job-history-filter-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 5.25rem; padding: 0.75rem 1.25rem; background: var(--app-surface-muted); }
.job-history-filter-bar__main, .job-history-filter-bar__summary, .job-history-filter-field, .job-history-date-range, .job-history-actions, .job-history-date, .job-history-file-cell, .job-history-device-cell { display: flex; align-items: center; }
.job-history-filter-bar__main { flex-wrap: wrap; gap: 0.625rem; min-width: 0; }
.job-history-search { width: min(17rem, 25vw); }
.job-history-shortcut { color: var(--app-text-placeholder); font-size: 0.625rem; }
.job-history-filter-field { gap: 0.35rem; white-space: nowrap; }
.job-history-filter-field__label { color: var(--app-text-secondary); font-size: 0.75rem; }
.job-history-status-select { width: 9.5rem; }
.job-history-date-range { width: 17rem; }
.job-history-filter-bar__summary { flex-shrink: 0; gap: 0.5rem; color: var(--app-text-secondary); font-size: 0.75rem; white-space: nowrap; }
.job-history-filter-bar__summary strong { color: var(--app-text-primary); font-weight: 600; }
.job-history-summary-divider { width: 1px; height: 1rem; background: var(--app-border-strong); }
.job-history-view-toggle { display: inline-flex; align-items: center; margin-left: 0.25rem; padding: 0.15rem; border: 1px solid var(--app-border); border-radius: 0.25rem; background: #fff; }
.job-history-view-toggle__button--active, .job-history-view-toggle button:hover { color: var(--app-primary); background: var(--app-primary-light); }
.job-history-view-toggle button { display: inline-flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.5rem; padding: 0; border: 0; border-radius: 0.2rem; background: transparent; color: var(--app-text-secondary); cursor: pointer; }
.job-history-content { display: flex; flex: 1 1 0%; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden; }
.job-history-table-scroll, .job-history-grid-view { flex: 1 1 0%; min-width: 0; min-height: 0; overflow: auto; }
.job-history-table { min-width: 77rem; }
.job-history-table :deep(th) { height: 2.75rem; background: #fff; color: var(--app-text-secondary); font-size: 0.75rem; font-weight: 500; }
.job-history-table :deep(td) { height: 4.25rem; padding: 0.5rem 0.75rem; color: var(--app-text-primary); font-size: 0.75rem; }
.job-history-table :deep(tr:hover td) { background: var(--app-surface-muted); }
.job-history-id, .job-history-date, .job-history-file-cell small, .job-history-device-cell small, .job-history-grid-card__bottom, .job-history-progress__summary small { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.job-history-id { color: var(--app-text-primary); font-weight: 600; }
.job-history-file-cell, .job-history-device-cell { gap: 0.55rem; min-width: 0; }
.job-history-file-cell > div, .job-history-device-cell > div { display: flex; flex-direction: column; min-width: 0; gap: 0.2rem; }
.job-history-file-cell strong, .job-history-device-cell strong { overflow: hidden; color: var(--app-text-primary); font-size: 0.75rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.job-history-file-cell small, .job-history-device-cell small { color: var(--app-text-placeholder); font-size: 0.625rem; }
.job-history-file-cell__icon { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 1.9rem; height: 1.9rem; border-radius: 0.35rem; background: var(--app-primary-light); color: var(--app-primary); }
.job-history-device-cell__dot { flex: 0 0 auto; width: 0.45rem; height: 0.45rem; border-radius: 50%; background: var(--app-primary); }
.job-history-device-cell__dot--primary { background: var(--app-primary); }
.job-history-device-cell__dot--success { background: var(--app-success); }
.job-history-device-cell__dot--warning { background: var(--app-warning); }
.job-history-device-cell__dot--danger { background: var(--app-danger); }
.job-history-status { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.45rem; border-radius: 0.25rem; background: var(--app-primary-light); color: var(--app-primary); font-size: 0.6875rem; white-space: nowrap; }
.job-history-status i { width: 0.35rem; height: 0.35rem; border-radius: 50%; background: currentColor; }
.job-history-status--printing, .job-history-status--completed { background: var(--app-success-light); color: var(--app-success); }
.job-history-status--paused { background: var(--app-warning-light); color: var(--app-warning); }
.job-history-status--failed { background: var(--app-danger-light); color: var(--app-danger); }
.job-history-status--cancelled, .job-history-status--ready, .job-history-status--reconciling { background: var(--app-surface-muted); color: var(--app-text-secondary); }
.job-history-priority { display: inline-block; min-width: 1.5rem; padding: 0.2rem 0.3rem; border-radius: 0.2rem; background: var(--app-surface-muted); color: var(--app-text-secondary); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.6875rem; }
.job-history-priority--primary { background: var(--app-primary-light); color: var(--app-primary); }
.job-history-priority--warning { background: var(--app-warning-light); color: var(--app-warning); }
.job-history-priority--danger { background: var(--app-danger-light); color: var(--app-danger); }
.job-history-progress { width: 100%; min-width: 8.5rem; }
.job-history-progress__summary { display: flex; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.35rem; color: var(--app-text-secondary); font-size: 0.6875rem; }
.job-history-progress__summary small { color: var(--app-text-placeholder); font-size: 0.5625rem; }
.job-history-progress__track { width: 100%; height: 0.3rem; overflow: hidden; border-radius: 999px; background: var(--app-border); }
.job-history-progress__fill { display: block; height: 100%; border-radius: inherit; background: var(--app-primary); }
.job-history-progress__fill--success { background: var(--app-success); }
.job-history-progress__fill--warning { background: var(--app-warning); }
.job-history-progress__fill--danger { background: var(--app-danger); }
.job-history-material { display: inline-block; padding: 0.2rem 0.4rem; border-radius: 0.2rem; background: var(--app-success-light); color: var(--app-success-active); font-size: 0.625rem; font-weight: 600; }
.job-history-material--abs { background: var(--app-warning-light); color: var(--app-warning-active); }
.job-history-material--tpu { background: var(--app-primary-light); color: var(--app-primary-active); }
.job-history-date { gap: 0.35rem; color: var(--app-text-secondary); font-size: 0.6875rem; white-space: nowrap; }
.job-history-date :deep(svg) { color: var(--app-text-placeholder); }
.job-history-error { color: var(--app-danger); font-size: 0.6875rem; }
.job-history-muted { color: var(--app-text-placeholder); }
.job-history-actions { justify-content: flex-end; gap: 0.15rem; }
.job-history-grid-view { display: grid; align-content: start; grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr)); gap: 0.75rem; padding: 1rem; }
.job-history-grid-card { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; border: 1px solid var(--app-border); border-radius: 0.375rem; }
.job-history-grid-card__top, .job-history-grid-card__bottom { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.job-history-grid-card__file { display: flex; align-items: center; gap: 0.5rem; color: var(--app-text-primary); }
.job-history-grid-card__file strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.job-history-grid-card__meta, .job-history-grid-card__bottom { color: var(--app-text-secondary); font-size: 0.6875rem; }
.job-history-footer { display: flex; align-items: center; justify-content: space-between; min-height: 4.25rem; padding: 0.75rem 1.25rem; border-top: 1px solid var(--app-surface-muted); background: #fff; }
.job-history-footer__total { color: var(--app-text-secondary); font-size: 0.75rem; }
.job-history-footer__total strong { color: var(--app-text-primary); font-weight: 600; }
.job-history-footer :deep(.t-pagination) { margin: 0; }
.job-history-footer :deep(.t-pagination__total) { display: none; }
.job-history-state { display: flex; align-items: center; justify-content: center; flex: 1 1 auto; flex-direction: column; gap: 0.75rem; color: var(--app-text-placeholder); font-size: 0.8125rem; }
.is-loading { animation: job-history-spin 1s linear infinite; }
@keyframes job-history-spin { to { transform: rotate(360deg); } }
@media (max-width: 1100px) {
  .job-history-filter-bar { align-items: flex-start; flex-direction: column; }
  .job-history-filter-bar__summary { width: 100%; justify-content: flex-end; }
  .job-history-search { width: 15rem; }
}
@media (max-width: 768px) {
  .job-history-page { padding: 1rem; }
  .job-history-header { align-items: flex-start; flex-direction: column; }
  .job-history-header__actions { width: 100%; justify-content: flex-end; }
  .job-history-status-row { overflow-x: auto; padding: 0 0.75rem; }
  .job-history-status-tabs { gap: 1rem; }
  .job-history-more { display: none; }
  .job-history-filter-bar__main { width: 100%; }
  .job-history-search, .job-history-status-select, .job-history-date-range { width: 100%; }
  .job-history-filter-field { width: 100%; }
  .job-history-filter-bar__summary { justify-content: flex-start; overflow-x: auto; }
  .job-history-footer { padding: 0.75rem; }
}
</style>
