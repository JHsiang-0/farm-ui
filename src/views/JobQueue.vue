<template>
  <div class="h-full app-page-background flex flex-col overflow-hidden">
    <div class="app-page-toolbar mb-4">
      <h1 class="app-page-toolbar__title app-route-title">生产调度队列</h1>
      <div class="app-page-toolbar__actions">
        <t-button :icon="renderIcon(Refresh)" :loading="loading" @click="fetchQueue" size="medium">
          刷新
        </t-button>
      </div>
    </div>

    <t-card class="shadow-sm rounded-xl flex-1 flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200">
      <TdTable
        :data="queueData"
        :loading="loading"
        style="width: 100%"
        class="rounded-lg overflow-hidden flex-1"
        :header-cell-style="{ background: '#f9fafb' }"
        height="calc(100vh - 280px)"
      >
        <TdTableColumn prop="id" label="任务单号" width="100" align="center">
          <template #default="scope">
            <span class="font-mono font-semibold text-gray-700">#{{ scope.row.id }}</span>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="fileId" label="切片文件ID" width="100" align="center">
          <template #default="scope">
            <t-tag size="small" variant="light-outline">{{ scope.row.fileId }}</t-tag>
          </template>
        </TdTableColumn>

        <TdTableColumn label="耗材要求" width="120" align="center">
          <template #default="scope">
            <t-tag theme="warning" variant="light" size="small">
              {{ scope.row.materialType || '任意' }}
            </t-tag>
          </template>
        </TdTableColumn>

        <TdTableColumn label="喷嘴要求" width="100" align="center">
          <template #default="scope">
            <span class="font-medium text-gray-700">{{ scope.row.nozzleSize ? scope.row.nozzleSize + 'mm' : '任意' }}</span>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="priority" label="优先级" width="100" align="center">
          <template #default="scope">
            <t-tag
              :theme="getPriorityType(scope.row.priority)"
              variant="dark"
              size="small"
              class="min-w-10 text-center"
            >
              {{ scope.row.priority }}
            </t-tag>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="status" label="状态" width="140" align="center">
          <template #default="scope">
            <div class="flex items-center justify-center gap-2">
              <span v-if="scope.row.status === 'QUEUED'" class="text-sm animate-spin"><loading /></span>
              <span v-else-if="scope.row.status === 'ASSIGNED'" class="text-sm text-yellow-600"><pointer /></span>
              <span v-else-if="scope.row.status === 'PRINTING'" class="text-sm text-gray-600"><printer /></span>
              <span v-else-if="scope.row.status === 'COMPLETED'" class="text-sm text-green-600"><check /></span>
              <span v-else-if="scope.row.status === 'FAILED'" class="text-sm text-red-600"><circle-close /></span>
              <t-tag :theme="getStatusType(scope.row.status)" variant="light" size="small">
                {{ getStatusLabel(scope.row.status) }}
              </t-tag>
            </div>
          </template>
        </TdTableColumn>

        <TdTableColumn label="创建时间" min-width="160" prop="createdAt" align="center">
          <template #default="scope">
            <div class="flex items-center justify-center gap-2 text-sm text-gray-600">
              <span><clock /></span>
              <span>{{ formatDateTime(scope.row.createdAt) }}</span>
            </div>
          </template>
        </TdTableColumn>

        <TdTableColumn label="调度操作" width="220" align="center" fixed="right">
          <template #default="scope">
            <t-button size="small" variant="text" @click="openTaskDetail(scope.row)">详情</t-button>
            <t-button
              size="small" theme="primary"
              @click="openAssignDialog(scope.row)"
              :disabled="scope.row.status !== 'QUEUED'"
            >
              <span><promotion /></span>
              分配机器
            </t-button>
            <t-popconfirm content="确定要取消这个任务吗？"
              theme="danger"
              @confirm="handleCancel(scope.row.id)"
              :disabled="!canCancel(scope.row.status)"
            >
              <template>
                <t-button size="small" theme="danger" variant="outline" :disabled="!canCancel(scope.row.status)">
                  <span><circle-close /></span>
                </t-button>
              </template>
            </t-popconfirm>
          </template>
        </TdTableColumn>
      </TdTable>

      <t-empty
        v-if="queueData.length === 0 && !loading"
        description="当前没有排队中的任务，机器都在闲着呢！"
      >
        <template #image>
          <coffee :size="64" class="text-gray-400" />
        </template>
      </t-empty>
    </t-card>

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
import { ref, onMounted } from 'vue'
import {
  RefreshIcon as Refresh,
  LocationIcon as Pointer,
  PrintIcon as Printer,
  TimeIcon as Clock,
  SendIcon as Promotion,
  CloseCircleIcon as CircleClose,
  FileIcon as Coffee,
  CheckIcon as Check
} from 'tdesign-icons-vue-next'
import { getJobQueue, cancelJob, assignJobToPrinter } from '@/api/job'
import { getPrinterList } from '@/api/printer'
import { message } from '@/utils/message'
import { formatDateTime } from '@/utils/formatters'
import { renderIcon } from '@/utils/tdesign'
import TdTable from '@/components/TdTable.vue'
import TdTableColumn from '@/components/TdTableColumn.vue'
import TaskDetailDrawer from '@/components/TaskDetailDrawer.vue'

defineOptions({ name: 'JobQueue' })

const loading = ref(false)
const queueData = ref([])

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
    'QUEUED': 'primary',
    'ASSIGNED': 'warning',
    'PRINTING': 'success',
    'COMPLETED': 'default',
    'FAILED': 'danger'
  }
  return map[status] || 'default'
}

// 获取状态显示文本
const getStatusLabel = (status) => {
  const map = {
    'QUEUED': '排队中',
    'ASSIGNED': '已分配待确认',
    'READY': '已上传待机',
    'PRINTING': '打印中',
    'PAUSED': '已暂停',
    'COMPLETED': '已完成',
    'FAILED': '失败',
    'CANCELLED': '已取消'
  }
  return map[status] || status
}

// 判断任务是否可以取消
const canCancel = (status) => {
  const cancelableStatuses = ['QUEUED', 'ASSIGNED', 'READY', 'PAUSED']
  return cancelableStatuses.includes(status)
}

const fetchQueue = async () => {
  loading.value = true
  try {
    const res = await getJobQueue()
    queueData.value = res.data || []
    restoreTaskDetailContext()
  } catch {
    // 忽略
  } finally {
    loading.value = false
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
</style>
