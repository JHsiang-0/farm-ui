<template>
  <div class="app-page-shell app-page-background job-queue-page">
    <div class="job-queue-page__header">
      <div class="job-queue-page__title-group">
        <h1 class="app-route-title">生产调度中心</h1>
        <div class="job-queue-summary">
          <span class="job-queue-summary__item job-queue-summary__item--blue">待分配 {{ queuedCount }}</span>
          <span>/</span>
          <span class="job-queue-summary__item job-queue-summary__item--amber">调度中 {{ dispatchingCount }}</span>
          <span>/</span>
          <span class="job-queue-summary__item job-queue-summary__item--orange">挂起 {{ pausedCount }}</span>
          <span>/</span>
          <span class="job-queue-summary__item job-queue-summary__item--green">今日已完工 {{ todayCompletedCount }}</span>
        </div>
      </div>
      <t-button :icon="renderIcon(Refresh)" :loading="loading" size="medium" @click="fetchQueue">
        刷新
      </t-button>
    </div>

    <section class="job-queue-card">
      <div class="job-queue-tabs-row">
        <nav class="job-queue-tabs" aria-label="任务队列视图">
          <button
            v-for="tab in queueTabs"
            :key="tab.value"
            type="button"
            class="job-queue-tab"
            :class="{ 'job-queue-tab--active': activeTab === tab.value }"
            @click="handleTabChange(tab.value)"
          >
            {{ tab.label }}
            <span class="job-queue-tab__count">{{ tab.count }}</span>
          </button>
        </nav>
        <div class="job-queue-view-toggle" role="group" aria-label="视图切换">
          <t-button variant="text" size="small" :class="{ 'job-queue-view-toggle--active': viewMode === 'list' }" aria-label="列表视图" @click="viewMode = 'list'">
            <List />
          </t-button>
          <t-button variant="text" size="small" :class="{ 'job-queue-view-toggle--active': viewMode === 'grid' }" aria-label="网格视图" @click="viewMode = 'grid'">
            <Grid />
          </t-button>
        </div>
      </div>

      <div class="job-queue-filters">
        <div class="job-queue-filters__fields">
          <t-input
            v-model="filters.keyword"
            class="job-queue-filters__search"
            placeholder="通过任务单号/切片文件名检索（按 Enter 过滤）..."
            clearable
            size="medium"
            @keyup.enter="handleSearch"
          >
            <template #prefixIcon><Search /></template>
          </t-input>
          <t-select v-model="filters.machineModel" class="job-queue-filters__select" placeholder="按机型过滤：全部机型" clearable size="medium" @change="handleSearch">
            <t-option v-for="model in machineModels" :key="model" :label="model" :value="model" />
          </t-select>
          <t-select v-model="filters.nozzleSize" class="job-queue-filters__select" placeholder="喷嘴规格：全部" clearable size="medium" @change="handleSearch">
            <t-option label="0.2mm（高精度）" value="0.2" />
            <t-option label="0.4mm（常规）" value="0.4" />
            <t-option label="0.6mm（高速 / 耐磨）" value="0.6" />
            <t-option label="0.8mm（粗打）" value="0.8" />
          </t-select>
          <t-select v-model="filters.materialType" class="job-queue-filters__select" placeholder="材质筛选：全部材质" clearable size="medium" @change="handleSearch">
            <t-option v-for="material in materialOptions" :key="material" :label="material" :value="material" />
          </t-select>
        </div>
      </div>

      <div class="job-queue-table-area">
        <div v-if="loading" class="job-queue-state">
          <Refresh :size="40" class="is-loading" />
          <p>加载中...</p>
        </div>
        <div v-else-if="pagedQueueData.length === 0" class="job-queue-state">
          <Coffee :size="56" />
          <p>{{ activeTab === 'paused' ? '当前没有挂起任务' : '当前没有排队中的任务' }}</p>
        </div>
        <div v-else-if="viewMode === 'list'" class="job-queue-list-view">
          <TdTable
            class="job-queue-table"
            :data="pagedQueueData"
            :loading="loading"
            style="width: 100%"
            @selection-change="handleSelectionChange"
            @row-click="openTaskDetail"
          >
            <TdTableColumn type="selection" width="44" align="center" />
            <TdTableColumn label="任务单号 / 3D切片模型" min-width="250">
              <template #default="scope">
                <div class="job-name-cell">
                  <div class="job-name-cell__icon" :class="{ 'job-name-cell__icon--warning': scope.row.status === 'PAUSED' }">
                    <CircleClose v-if="scope.row.status === 'PAUSED'" :size="17" />
                    <Document v-else :size="18" />
                  </div>
                  <div class="job-name-cell__content">
                    <div class="job-name-cell__title">
                      <span :title="getJobFileName(scope.row)">{{ getJobFileName(scope.row) }}</span>
                      <t-tag size="small" :theme="getFileTagType(scope.row.materialType)">G-Code</t-tag>
                    </div>
                    <div class="job-name-cell__subtext">
                      #{{ scope.row.id }} · {{ formatJobFileSize(scope.row) }} · {{ formatPriority(scope.row.priority) }}
                    </div>
                  </div>
                </div>
              </template>
            </TdTableColumn>
            <TdTableColumn label="适配机型 | 喷嘴 | 热床" min-width="180">
              <template #default="scope">
                <div class="job-compatibility">
                  <strong>{{ getJobMachineModel(scope.row) }}</strong>
                  <span>{{ formatJobNozzle(scope.row) }} · {{ formatJobBed(scope.row) }}</span>
                </div>
              </template>
            </TdTableColumn>
            <TdTableColumn label="持续工时" width="105" align="center">
              <template #default="scope">
                <span class="job-mono">{{ formatJobDuration(scope.row) }}</span>
              </template>
            </TdTableColumn>
            <TdTableColumn label="预估耗材 & 材质" width="145">
              <template #default="scope">
                <div class="job-material">
                  <strong>{{ formatJobWeight(scope.row) }}</strong>
                  <t-tag :theme="getFileTagType(scope.row.materialType)" size="small">{{ scope.row.materialType || '任意' }}</t-tag>
                </div>
              </template>
            </TdTableColumn>
            <TdTableColumn prop="priority" label="优先级" width="100" align="center">
              <template #default="scope">
                <t-input-number
                  v-if="scope.row.status === 'QUEUED'"
                  :value="Number(scope.row.priority ?? 0)"
                  :min="0"
                  :max="100"
                  :step="1"
                  :decimal-places="0"
                  size="small"
                  style="width: 82px"
                  @change="value => handlePriority(scope.row, value)"
                />
                <t-tag v-else :theme="getPriorityType(scope.row.priority)" variant="light" size="small">
                  {{ formatPriority(scope.row.priority) }}
                </t-tag>
              </template>
            </TdTableColumn>
            <TdTableColumn prop="createdAt" label="创建时间" width="145">
              <template #default="scope">{{ formatDateTime(scope.row.createdAt) }}</template>
            </TdTableColumn>
            <TdTableColumn prop="status" label="队列状态" width="115" align="center">
              <template #default="scope">
                <t-tag :theme="getStatusType(scope.row.status)" variant="light" size="small">
                  {{ getStatusLabel(scope.row.status) }}
                </t-tag>
              </template>
            </TdTableColumn>
            <TdTableColumn label="调度操作" width="220" align="center" fixed="right">
              <template #default="scope">
                <div class="task-action-group">
                  <t-button size="small" variant="text" @click.stop="openTaskDetail(scope.row)">详情</t-button>
                  <t-button v-if="scope.row.status === 'QUEUED'" size="small" variant="outline" theme="primary" @click.stop="openAssignDialog(scope.row)">
                    分配机位
                  </t-button>
                  <t-button v-else-if="['ASSIGNED', 'READY'].includes(scope.row.status)" size="small" variant="text" @click.stop="handleRequeue(scope.row.id)">
                    重新排队
                  </t-button>
                  <t-button v-if="['ASSIGNED', 'READY'].includes(scope.row.status) && scope.row.printerId" size="small" variant="text" theme="warning" @click.stop="handleConfirmSafe(scope.row)">
                    确认安全
                  </t-button>
                  <t-button v-if="['ASSIGNED', 'READY'].includes(scope.row.status) && scope.row.printerId" size="small" variant="text" theme="success" @click.stop="handleStart(scope.row)">
                    启动
                  </t-button>
                  <t-popconfirm v-if="canCancel(scope.row.status)" content="确定要移出这个任务吗？" theme="danger" @confirm="handleCancel(scope.row.id)">
                    <template #trigger>
                      <t-button size="small" variant="text" theme="danger" aria-label="移出队列" @click.stop>
                        <Delete :size="15" />
                      </t-button>
                    </template>
                  </t-popconfirm>
                </div>
              </template>
            </TdTableColumn>
          </TdTable>
        </div>
        <div v-else class="job-queue-grid-view">
          <article v-for="job in pagedQueueData" :key="job.id" class="job-card" :class="{ 'job-card--selected': selectedJobIds.includes(job.id) }">
            <div class="job-card__header">
              <t-checkbox :checked="selectedJobIds.includes(job.id)" @click.stop="toggleJobSelection(job.id)" />
              <t-tag :theme="getStatusType(job.status)" variant="light" size="small">{{ getStatusLabel(job.status) }}</t-tag>
            </div>
            <div class="job-card__title" :title="getJobFileName(job)">{{ getJobFileName(job) }}</div>
            <div class="job-card__meta">#{{ job.id }} · {{ getJobMachineModel(job) }}</div>
            <div class="job-card__stats">
              <span>{{ formatJobDuration(job) }}</span>
              <span>{{ formatJobWeight(job) }}</span>
              <t-tag :theme="getFileTagType(job.materialType)" size="small">{{ job.materialType || '任意' }}</t-tag>
            </div>
            <div class="job-card__actions">
              <t-button size="small" variant="text" @click="openTaskDetail(job)">详情</t-button>
              <t-button v-if="job.status === 'QUEUED'" size="small" variant="outline" theme="primary" @click="openAssignDialog(job)">分配机位</t-button>
              <t-button v-else-if="['ASSIGNED', 'READY'].includes(job.status)" size="small" variant="text" @click="handleRequeue(job.id)">重新排队</t-button>
              <t-button v-if="canCancel(job.status)" size="small" variant="text" theme="danger" @click="handleCancel(job.id)">移出</t-button>
            </div>
          </article>
        </div>
      </div>

      <footer class="job-queue-footer">
        <div class="job-queue-footer__batch">
          <t-button variant="outline" size="small" :disabled="cancelableSelectedCount === 0" :icon="renderIcon(Delete)" @click="handleBatchCancel">
            批量移出
          </t-button>
          <span>{{ selectedJobIds.length }} 已选择</span>
          <span class="job-queue-footer__divider">|</span>
          <span class="job-queue-footer__health">在线空闲打印机：<strong>{{ idlePrinterCount }} 台</strong></span>
        </div>
        <div class="job-queue-footer__pagination">
          <span>共 {{ filteredQueueData.length }} 条调度工单</span>
          <t-pagination
            v-model:current="pagination.pageNum"
            v-model:pageSize="pagination.pageSize"
            :total="filteredQueueData.length"
            :page-size-options="[20, 50, 100]"
            :total-content="false"
            @change="handlePageChange"
          />
        </div>
      </footer>
    </section>

    <!-- 指派打印机弹窗 -->
    <t-dialog v-model:visible="assignDialogVisible" header="指派打印机"
      width="520px"
      destroy-on-close
    >
      <div class="mb-5">
        <t-alert
          :title="`为任务 #${currentJob?.id} 选择打印机`" theme="info"
          :closable="false"

        />
      </div>

      <t-form label-width="100px">
        <t-form-item label="空闲打印机">
          <t-select
            v-model="selectedPrinterId"
            placeholder="请选择可用的打印机"
            style="width: 100%"
            :loading="loadingPrinters"
          >
            <t-option
              v-for="printer in idlePrinters"
              :key="printer.id"
              :label="`${printer.name} (${printer.ipAddress})`"
              :value="printer.id"
            >
              <div class="flex flex-col py-2">
                <span class="font-medium text-gray-900">{{ printer.name }}</span>
                <span class="text-sm text-gray-600 mt-0.5">IP: {{ printer.ipAddress }} | 耗材: {{ printer.currentMaterial }}</span>
              </div>
            </t-option>
          </t-select>

          <t-alert
            v-if="idlePrinters.length === 0 && !loadingPrinters"
            title="当前没有空闲的打印机，请等待其他任务完成" theme="warning"
            :closable="false"

            class="mt-3"
          />
        </t-form-item>
      </t-form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <t-button @click="assignDialogVisible = false">取消</t-button>
          <t-button theme="success"
            @click="submitAssign"
            :disabled="!selectedPrinterId"
            :loading="assigning"
          >
            <span><check /></span>
            确认分配
          </t-button>
        </div>
      </template>
    </t-dialog>
    <TaskDetailDrawer
      v-model="detailDrawerVisible"
      :task="selectedJob"
      @update:model-value="handleTaskDetailVisibility"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import {
  DeleteIcon as Delete,
  FileIcon as Document,
  GridViewIcon as Grid,
  SearchIcon as Search,
  ViewListIcon as List,
  RefreshIcon as Refresh,
  CloseCircleIcon as CircleClose,
  FileIcon as Coffee,
  CheckIcon as Check
} from 'tdesign-icons-vue-next'
import { getJobQueue, getJobPage, cancelJob, assignJobToPrinter, requeueJob, updateJobPriority, startJob } from '@/api/job'
import { confirmSafe, getPrinterList } from '@/api/printer'
import { message, confirmMessage } from '@/utils/message'
import { formatDateTime, formatDuration, formatFileSize } from '@/utils/formatters'
import { renderIcon } from '@/utils/tdesign'
import TdTable from '@/components/TdTable.vue'
import TdTableColumn from '@/components/TdTableColumn.vue'
import TaskDetailDrawer from '@/components/TaskDetailDrawer.vue'

defineOptions({ name: 'JobQueue' })

const loading = ref(false)
const queueData = ref([])
const activeTab = ref('queue')
const viewMode = ref('list')
const selectedJobIds = ref([])
const todayCompletedCount = ref(0)
const idlePrinterCount = ref(0)
const filters = reactive({
  keyword: '',
  machineModel: '',
  nozzleSize: '',
  materialType: ''
})
const pagination = reactive({
  pageNum: 1,
  pageSize: 20
})

const machineModels = ['拓竹 A1', '拓竹 X1-Carbon', '拓竹 P1S', '创想三维 K1 Max']
const materialOptions = ['PLA', 'PLA-CF', 'ABS', 'ASA', 'PETG', 'TPU']

const queuedCount = computed(() => queueData.value.filter(job => job.status === 'QUEUED').length)
const dispatchingCount = computed(() => queueData.value.filter(job => ['ASSIGNED', 'READY'].includes(job.status)).length)
const pausedCount = computed(() => queueData.value.filter(job => job.status === 'PAUSED').length)

const filteredQueueData = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()

  return queueData.value.filter(job => {
    if (activeTab.value === 'direct' && job.status !== 'READY') return false
    if (activeTab.value === 'paused' && job.status !== 'PAUSED') return false
    if (keyword && ![job.id, job.fileId, job.fileName].some(value => String(value || '').toLowerCase().includes(keyword))) return false
    if (filters.machineModel && getJobMachineModel(job) !== filters.machineModel) return false
    if (filters.nozzleSize && String(job.nozzleSize ?? '') !== filters.nozzleSize) return false
    if (filters.materialType && String(job.materialType || '').toUpperCase() !== filters.materialType.toUpperCase()) return false
    return true
  })
})

const pagedQueueData = computed(() => {
  const start = (pagination.pageNum - 1) * pagination.pageSize
  return filteredQueueData.value.slice(start, start + pagination.pageSize)
})

const queueTabs = computed(() => [
  { value: 'queue', label: '调度排队', count: queueData.value.length },
  { value: 'direct', label: '直接打印通道', count: queueData.value.filter(job => job.status === 'READY').length },
  { value: 'paused', label: '已暂停挂起', count: pausedCount.value }
])

const cancelableSelectedCount = computed(() => selectedJobIds.value
  .map(id => queueData.value.find(job => String(job.id) === String(id)))
  .filter(job => job && canCancel(job.status)).length)

// 派单弹窗状态
const assignDialogVisible = ref(false)
const assigning = ref(false)
const currentJob = ref(null)
const selectedPrinterId = ref(null)
const idlePrinters = ref([])
const loadingPrinters = ref(false)
const detailDrawerVisible = ref(false)
const selectedJob = ref(null)
const JOB_QUEUE_DETAIL_CONTEXT_KEY = 'farm-ui:job-queue-detail'

const openTaskDetail = job => {
  selectedJob.value = job
  sessionStorage.setItem(JOB_QUEUE_DETAIL_CONTEXT_KEY, String(job.id))
  detailDrawerVisible.value = true
}

const handleTaskDetailVisibility = visible => {
  if (!visible) {
    detailDrawerVisible.value = false
    selectedJob.value = null
    sessionStorage.removeItem(JOB_QUEUE_DETAIL_CONTEXT_KEY)
  }
}

const restoreTaskDetailContext = () => {
  const jobId = sessionStorage.getItem(JOB_QUEUE_DETAIL_CONTEXT_KEY)
  if (!jobId || selectedJob.value) return

  const job = queueData.value.find(item => String(item.id) === jobId)
  if (job) openTaskDetail(job)
}

// 获取优先级标签类型
const getPriorityType = (priority) => {
  if (priority >= 80) return 'danger'
  if (priority >= 50) return 'warning'
  if (priority >= 20) return 'primary'
  return 'default'
}

// 获取状态标签类型
const getStatusType = (status) => {
  const map = {
    'UPLOADING': 'warning',
    'QUEUED': 'primary',
    'ASSIGNED': 'warning',
    'READY': 'primary',
    'PRINTING': 'success',
    'PAUSED': 'warning',
    'COMPLETED': 'default',
    'FAILED': 'danger',
    'RECONCILING': 'warning'
  }
  return map[status] || 'default'
}

// 获取状态显示文本
const getStatusLabel = (status) => {
  const map = {
    'UPLOADING': '上传中',
    'QUEUED': '排队中',
    'ASSIGNED': '已分配待确认',
    'READY': '已上传待机',
    'PRINTING': '打印中',
    'PAUSED': '已暂停',
    'COMPLETED': '已完成',
    'FAILED': '失败',
    'CANCELLED': '已取消',
    'RECONCILING': '状态核对中'
  }
  return map[status] || status
}

// 判断任务是否可以取消
const canCancel = (status) => {
  const cancelableStatuses = ['QUEUED', 'ASSIGNED', 'READY', 'PAUSED']
  return cancelableStatuses.includes(status)
}

const getJobFileName = job => job.fileName || `文件 #${job.fileId}`

const getJobMachineModel = job => job.machineModel || job.printerModel || job.printerName || (job.printerId ? `设备 ${job.printerId}` : '未指定')

const formatJobNozzle = job => {
  const nozzleSize = Number(job.nozzleSize)
  return Number.isFinite(nozzleSize) && nozzleSize > 0 ? `${nozzleSize.toFixed(1)}mm` : '喷嘴 --'
}

const formatJobBed = job => {
  const bedTemp = Number(job.bedTemp)
  return Number.isFinite(bedTemp) ? `热床 ${bedTemp}℃` : '热床 --'
}

const formatJobDuration = job => {
  const duration = Number(job.estTime ?? job.estimatedSeconds ?? job.duration)
  return Number.isFinite(duration) ? formatDuration(duration) : '--'
}

const formatJobWeight = job => {
  const weight = Number(job.filamentWeight)
  return Number.isFinite(weight) ? `${weight}g` : '--'
}

const formatJobFileSize = job => formatFileSize(job.fileSize)

const formatPriority = priority => {
  const value = Number(priority)
  if (value >= 80) return '加急'
  if (value >= 50) return '优先'
  return '普通'
}

const getFileTagType = materialType => {
  const types = { PLA: 'success', 'PLA-CF': 'default', ABS: 'warning', ASA: 'warning', PETG: 'primary', TPU: 'default' }
  return types[String(materialType || '').toUpperCase()] || 'default'
}

const handleSearch = () => {
  pagination.pageNum = 1
  selectedJobIds.value = []
}

const handleTabChange = tab => {
  activeTab.value = tab
  handleSearch()
}

const handlePageChange = ({ current, pageSize }) => {
  pagination.pageNum = current
  pagination.pageSize = pageSize
  selectedJobIds.value = []
}

const handleSelectionChange = selection => {
  selectedJobIds.value = selection.map(item => typeof item === 'object' ? item.id : item)
}

const toggleJobSelection = id => {
  const index = selectedJobIds.value.findIndex(item => String(item) === String(id))
  if (index >= 0) {
    selectedJobIds.value.splice(index, 1)
  } else {
    selectedJobIds.value.push(id)
  }
}

const loadQueueSummary = async () => {
  const [historyResult, printerResult] = await Promise.allSettled([
    getJobPage({ pageNum: 1, pageSize: 100, status: 'COMPLETED' }),
    getPrinterList({ pageNum: 1, pageSize: 100 })
  ])

  if (historyResult.status === 'fulfilled') {
    const today = formatDateTime(new Date()).slice(0, 10)
    todayCompletedCount.value = (historyResult.value.data?.records || [])
      .filter(job => formatDateTime(job.completedAt || job.endedAt).startsWith(today)).length
  }

  if (printerResult.status === 'fulfilled') {
    idlePrinterCount.value = (printerResult.value.data?.records || [])
      .filter(printer => printer.status === 'IDLE').length
  }
}

const fetchQueue = async () => {
  loading.value = true
  try {
    const [queueResult] = await Promise.allSettled([getJobQueue(), loadQueueSummary()])
    if (queueResult.status === 'fulfilled') queueData.value = queueResult.value.data || []
    selectedJobIds.value = []
    restoreTaskDetailContext()
  } catch {
    // 忽略
  } finally {
    loading.value = false
  }
}

const handleBatchCancel = async () => {
  const selectedJobs = selectedJobIds.value
    .map(id => queueData.value.find(job => String(job.id) === String(id)))
    .filter(job => job && canCancel(job.status))

  if (!selectedJobs.length) return

  try {
    await confirmMessage(
      `确定要移出选中的 ${selectedJobs.length} 个任务吗？`,
      '批量移出确认',
      { confirmButtonText: '确定移出', cancelButtonText: '取消', type: 'warning' }
    )
    const results = await Promise.allSettled(selectedJobs.map(job => cancelJob(job.id)))
    const successCount = results.filter(result => result.status === 'fulfilled').length
    const failedCount = results.length - successCount
    if (failedCount) {
      message.warning(`已移出 ${successCount} 个任务，${failedCount} 个任务处理失败`)
    } else {
      message.success(`已移出 ${successCount} 个任务`)
    }
    selectedJobIds.value = []
    await fetchQueue()
  } catch (error) {
    if (error !== 'cancel') console.error('批量移出任务失败:', error)
  }
}

const handleCancel = async (id) => {
  try {
    await cancelJob(id)
    message.success('任务已取消')
    fetchQueue()
  } catch {
    // 错误在拦截器处理
  }
}

const handleRequeue = async id => {
  try {
    await requeueJob(id)
    message.success('任务已重新排队')
    fetchQueue()
  } catch {
    // 错误在拦截器处理
  }
}

const handlePriority = async (job, value) => {
  const priority = Number(value)
  try {
    await updateJobPriority(job.id, priority)
    job.priority = priority
    message.success('优先级已更新')
  } catch {
    fetchQueue()
  }
}

const openAssignDialog = async (job) => {
  currentJob.value = job
  selectedPrinterId.value = null
  assignDialogVisible.value = true

  loadingPrinters.value = true
  try {
    const res = await getPrinterList({ pageNum: 1, pageSize: 100 })
    const allPrinters = res.data?.records || []
    idlePrinters.value = allPrinters.filter(p => p.status === 'IDLE')
  } catch {
    message.error('获取打印机列表失败')
  } finally {
    loadingPrinters.value = false
  }
}

const submitAssign = async () => {
  if (!selectedPrinterId.value) return
  assigning.value = true
  try {
    await assignJobToPrinter(currentJob.value.id, selectedPrinterId.value)
    message.success('任务分配成功！请等待操作员确认安全后启动打印')
    assignDialogVisible.value = false
    fetchQueue()
  } catch {
    // 报错信息会被拦截器弹窗
  } finally {
    assigning.value = false
  }
}

const handleConfirmSafe = async job => {
  try {
    await confirmMessage(
      `请确认打印机 ${job.printerName || job.printerId} 的热床已清理且可以安全打印。`,
      '现场安全确认',
      { confirmButtonText: '确认安全', cancelButtonText: '返回检查', type: 'warning' }
    )
    await confirmSafe(job.printerId)
    message.success('已确认安全，可以启动打印')
    await fetchQueue()
  } catch (error) {
    if (error !== 'cancel') console.error('确认打印安全失败:', error)
  }
}

const handleStart = async job => {
  try {
    await confirmMessage(
      `确认启动任务 #${job.id}？这会向打印机发送上传并启动请求。`,
      '启动打印确认',
      { confirmButtonText: '启动打印', cancelButtonText: '取消', type: 'danger' }
    )
    await startJob(job.id, 'START_PRINT')
    message.success('启动请求已发送，请观察设备状态')
    await fetchQueue()
  } catch (error) {
    if (error !== 'cancel') console.error('启动打印失败:', error)
  }
}

onMounted(() => {
  fetchQueue()
})
</script>

<style scoped>
@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: rotate 1s linear infinite;
}

.job-queue-page {
  --queue-primary: #1677ff;
  --queue-primary-hover: #0958d9;
  --queue-border: #e5e7eb;
  --queue-text: #1f2937;
  --queue-muted: #6b7280;
  min-width: 0;
}

.job-queue-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex: 0 0 auto;
  min-height: 3rem;
  margin-bottom: 0.875rem;
}

.job-queue-page__title-group {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  min-width: 0;
}

.job-queue-page__title-group h1 {
  margin: 0;
  color: var(--queue-text);
  white-space: nowrap;
}

.job-queue-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: #d1d5db;
  font-size: 0.75rem;
  font-weight: 500;
}

.job-queue-summary__item {
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  white-space: nowrap;
}

.job-queue-summary__item--blue { color: #0958d9; background: #e6f4ff; }
.job-queue-summary__item--amber { color: #ad6800; background: #fff7e6; }
.job-queue-summary__item--orange { color: #d46b08; background: #fff2e8; }
.job-queue-summary__item--green { color: #087f5b; background: #ecfdf5; }

.job-queue-card {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--queue-border);
  border-radius: 0.5rem;
  background: #fff;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}

.job-queue-tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.25rem;
  padding: 0.5rem 1rem 0;
  border-bottom: 1px solid var(--queue-border);
}

.job-queue-tabs {
  display: flex;
  align-items: stretch;
  gap: 1.5rem;
  min-width: 0;
}

.job-queue-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 0.25rem 0.75rem;
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--queue-muted);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 0.8125rem;
  white-space: nowrap;
}

.job-queue-tab:hover,
.job-queue-tab--active {
  color: var(--queue-primary);
}

.job-queue-tab--active {
  border-bottom-color: var(--queue-primary);
  font-weight: 600;
}

.job-queue-tab__count {
  min-width: 1.25rem;
  padding: 0.1rem 0.375rem;
  border-radius: 999px;
  color: #64748b;
  background: #f1f5f9;
  font-size: 0.6875rem;
  text-align: center;
}

.job-queue-tab--active .job-queue-tab__count {
  color: var(--queue-primary);
  background: #e6f4ff;
}

.job-queue-view-toggle {
  display: flex;
  align-items: center;
  padding: 0.125rem;
  border: 1px solid var(--queue-border);
  border-radius: 0.375rem;
  background: #f8fafc;
}

.job-queue-view-toggle :deep(.t-button) {
  min-width: 2rem;
  color: #9ca3af;
}

.job-queue-view-toggle :deep(.job-queue-view-toggle--active) {
  color: var(--queue-primary);
  background: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 8%);
}

.job-queue-filters {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--queue-border);
}

.job-queue-filters__fields {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.625rem;
  min-width: 0;
}

.job-queue-filters__search {
  width: min(22rem, 100%);
}

.job-queue-filters__select {
  width: 10.5rem;
}

.job-queue-table-area {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.job-queue-list-view {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.job-queue-table {
  height: auto;
  min-height: 100%;
}

.job-queue-table :deep(.t-table__content) {
  overflow-y: auto;
}

.job-queue-table :deep(.t-table th) {
  color: var(--queue-muted);
  background: #f8fafc;
  font-weight: 400;
}

.job-queue-table :deep(.t-table td),
.job-queue-table :deep(.t-table th) {
  height: 4.25rem;
  padding: 0.625rem 0.75rem;
  border-color: #f1f5f9;
}

.job-queue-table :deep(.t-table__body tr:hover td) {
  background: #f8fbff;
}

.job-name-cell {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

.job-name-cell__icon {
  display: flex;
  flex: 0 0 2rem;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  color: #64748b;
  background: #f8fafc;
}

.job-name-cell__icon--warning {
  border-color: #fed7aa;
  color: #ea580c;
  background: #fff7ed;
}

.job-name-cell__content {
  min-width: 0;
}

.job-name-cell__title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  color: var(--queue-text);
  font-size: 0.8125rem;
  font-weight: 600;
}

.job-name-cell__title > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-name-cell__title :deep(.t-tag) {
  flex-shrink: 0;
  transform: scale(0.9);
  transform-origin: left center;
}

.job-name-cell__subtext {
  margin-top: 0.25rem;
  overflow: hidden;
  color: #9ca3af;
  font-size: 0.6875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-compatibility,
.job-material {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  line-height: 1.2;
}

.job-compatibility strong,
.job-material strong {
  color: var(--queue-text);
  font-size: 0.75rem;
  font-weight: 600;
}

.job-compatibility span {
  color: var(--queue-muted);
  font-size: 0.6875rem;
}

.job-material :deep(.t-tag) {
  align-self: flex-start;
}

.job-mono {
  color: var(--queue-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 500;
}

.task-action-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.125rem;
  min-width: 0;
  white-space: nowrap;
}

.task-action-group :deep(.t-button) {
  padding-right: 0.375rem;
  padding-left: 0.375rem;
}

.job-queue-state {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #9ca3af;
}

.job-queue-state p {
  margin: 0;
}

.job-queue-grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: 0.75rem;
  align-content: start;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: 1rem;
  overflow-y: auto;
}

.job-card {
  display: flex;
  min-width: 0;
  min-height: 12rem;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.875rem;
  border: 1px solid var(--queue-border);
  border-radius: 0.5rem;
  background: #fff;
}

.job-card--selected {
  border-color: var(--queue-primary);
  box-shadow: 0 4px 12px rgb(22 119 255 / 12%);
}

.job-card__header,
.job-card__stats,
.job-card__actions {
  display: flex;
  align-items: center;
}

.job-card__header,
.job-card__stats {
  justify-content: space-between;
}

.job-card__title {
  overflow: hidden;
  color: var(--queue-text);
  font-size: 0.8125rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-card__meta,
.job-card__stats {
  color: var(--queue-muted);
  font-size: 0.6875rem;
}

.job-card__actions {
  gap: 0.25rem;
  margin-top: auto;
}

.job-card__actions :deep(.t-button) {
  flex: 1 1 auto;
}

.job-queue-footer {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.25rem;
  padding: 0.625rem 1rem;
  border-top: 1px solid var(--queue-border);
  color: var(--queue-muted);
  font-size: 0.75rem;
}

.job-queue-footer__batch,
.job-queue-footer__pagination {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.job-queue-footer__pagination {
  gap: 1.25rem;
  margin-left: auto;
}

.job-queue-footer__pagination > span {
  flex-shrink: 0;
  white-space: nowrap;
}

.job-queue-footer__divider {
  color: #e5e7eb;
}

.job-queue-footer__health strong {
  color: #059669;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .job-queue-page__title-group {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.375rem;
  }

  .job-queue-filters {
    align-items: flex-start;
  }

  .job-queue-filters__select {
    width: 9.25rem;
  }
}

@media (max-width: 760px) {
  .job-queue-page__header,
  .job-queue-tabs-row,
  .job-queue-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .job-queue-page__header > :deep(.t-button),
  .job-queue-view-toggle {
    align-self: flex-end;
  }

  .job-queue-tabs {
    width: 100%;
    gap: 0.75rem;
    overflow-x: auto;
  }

  .job-queue-filters__fields {
    width: 100%;
  }

  .job-queue-filters__search,
  .job-queue-filters__select {
    width: 100%;
  }

  .job-queue-footer__pagination {
    width: 100%;
    justify-content: space-between;
    margin-left: 0;
  }
}
</style>
