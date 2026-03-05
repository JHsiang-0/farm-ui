<template>
  <div class="job-queue">
    <el-card class="queue-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon :size="20" color="var(--el-color-primary)"><list /></el-icon>
            <span>生产调度队列</span>
          </div>
          <el-button type="primary" plain @click="fetchQueue" :loading="loading">
            <el-icon><refresh /></el-icon>
            刷新队列
          </el-button>
        </div>
      </template>

      <el-table 
        :data="queueData" 
        v-loading="loading" 
        style="width: 100%" 
        class="custom-table"
        :header-cell-style="{ background: 'var(--ep-color-gray-1)' }"
      >
        <el-table-column prop="id" label="任务单号" width="100" align="center">
          <template #default="scope">
            <span class="job-id">#{{ scope.row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="fileId" label="切片文件ID" width="100" align="center">
          <template #default="scope">
            <el-tag size="small" effect="plain">{{ scope.row.fileId }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="耗材要求" width="120" align="center">
          <template #default="scope">
            <el-tag type="warning" effect="light" size="small">
              {{ scope.row.materialType || '任意' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="喷嘴要求" width="100" align="center">
          <template #default="scope">
            <span class="nozzle-req">{{ scope.row.nozzleSize ? scope.row.nozzleSize + 'mm' : '任意' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="priority" label="优先级" width="100" align="center">
          <template #default="scope">
            <el-tag 
              :type="getPriorityType(scope.row.priority)" 
              effect="dark"
              size="small"
              class="priority-tag"
            >
              {{ scope.row.priority }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="140" align="center">
          <template #default="scope">
            <div class="status-wrapper">
              <el-icon v-if="scope.row.status === 'QUEUED'" class="status-icon rotating"><loading /></el-icon>
              <el-icon v-else-if="scope.row.status === 'MANUAL'" class="status-icon warning"><pointer /></el-icon>
              <el-icon v-else-if="scope.row.status === 'PRINTING'" class="status-icon primary"><printer /></el-icon>
              <el-tag :type="getStatusType(scope.row.status)" effect="light" size="small">
                {{ getStatusLabel(scope.row.status) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" min-width="160" prop="createdAt" align="center">
          <template #default="scope">
            <div class="time-cell">
              <el-icon><clock /></el-icon>
              <span>{{ formatTime(scope.row.createdAt) }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="调度操作" width="220" align="center" fixed="right">
          <template #default="scope">
            <el-button 
              size="small" 
              type="primary" 
              @click="openAssignDialog(scope.row)"
              :disabled="scope.row.status === 'PRINTING'"
            >
              <el-icon><promotion /></el-icon>
              强制派单
            </el-button>
            <el-popconfirm 
              title="确定要取消这个任务吗？" 
              confirm-button-type="danger"
              @confirm="handleCancel(scope.row.id)"
            >
              <template #reference>
                <el-button size="small" type="danger" plain>
                  <el-icon><circle-close /></el-icon>
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-empty 
        v-if="queueData.length === 0 && !loading" 
        description="当前没有排队中的任务，机器都在闲着呢！"
      >
        <template #image>
          <el-icon :size="64" color="var(--ep-color-gray-4)"><coffee /></el-icon>
        </template>
      </el-empty>
    </el-card>

    <!-- 指派打印机弹窗 -->
    <el-dialog 
      v-model="assignDialogVisible" 
      title="指派打印机" 
      width="520px"
      class="assign-dialog"
      destroy-on-close
    >
      <div class="dialog-info">
        <el-alert
          :title="`为任务 #${currentJob?.id} 选择打印机`"
          type="info"
          :closable="false"
          show-icon
        />
      </div>

      <el-form label-width="100px" class="assign-form">
        <el-form-item label="空闲打印机">
          <el-select 
            v-model="selectedPrinterId" 
            placeholder="请选择可用的打印机" 
            style="width: 100%"
            v-loading="loadingPrinters"
          >
            <el-option 
              v-for="printer in idlePrinters" 
              :key="printer.id"
              :label="`${printer.name} (${printer.ipAddress})`"
              :value="printer.id"
            >
              <div class="printer-option">
                <span class="printer-name">{{ printer.name }}</span>
                <span class="printer-meta">IP: {{ printer.ipAddress }} | 耗材: {{ printer.currentMaterial }}</span>
              </div>
            </el-option>
          </el-select>
          
          <el-alert
            v-if="idlePrinters.length === 0 && !loadingPrinters"
            title="当前没有空闲的打印机，请等待其他任务完成"
            type="warning"
            :closable="false"
            show-icon
            class="mt-3"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="assignDialogVisible = false">取消</el-button>
          <el-button 
            type="success" 
            @click="submitAssign" 
            :disabled="!selectedPrinterId" 
            :loading="assigning"
          >
            <el-icon><check /></el-icon>
            确认下发指令
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { 
  List, 
  Refresh, 
  Pointer, 
  Printer,
  Clock,
  Promotion,
  CircleClose,
  Coffee,
  Check
} from '@element-plus/icons-vue'
import { getJobQueue, cancelJob, assignJobToPrinter } from '@/api/job'
import { getPrinterList } from '@/api/printer'
import { ElMessage } from 'element-plus'

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

// 获取优先级标签类型
const getPriorityType = (priority) => {
  if (priority >= 80) return 'danger'
  if (priority >= 50) return 'warning'
  if (priority >= 20) return 'primary'
  return 'info'
}

// 获取状态标签类型
const getStatusType = (status) => {
  const map = {
    'MANUAL': 'warning',
    'QUEUED': 'primary',
    'PRINTING': 'success',
    'COMPLETED': 'info',
    'CANCELLED': 'info'
  }
  return map[status] || 'info'
}

// 获取状态显示文本
const getStatusLabel = (status) => {
  const map = {
    'MANUAL': '待手动派单',
    'QUEUED': '自动排队中',
    'PRINTING': '打印中',
    'COMPLETED': '已完成',
    'CANCELLED': '已取消'
  }
  return map[status] || status
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const fetchQueue = async () => {
  loading.value = true
  try {
    const res = await getJobQueue()
    queueData.value = res.data || []
  } catch {
    // 忽略
  } finally {
    loading.value = false
  }
}

const handleCancel = async (id) => {
  try {
    await cancelJob(id)
    ElMessage.success('任务已取消')
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
    const res = await getPrinterList({ pageNum: 1, pageSize: 500 })
    const allPrinters = res.data.records || []
    idlePrinters.value = allPrinters.filter(p => p.status === 'IDLE')
  } catch {
    ElMessage.error('获取打印机列表失败')
  } finally {
    loadingPrinters.value = false
  }
}

const submitAssign = async () => {
  if (!selectedPrinterId.value) return
  assigning.value = true
  try {
    await assignJobToPrinter(currentJob.value.id, selectedPrinterId.value)
    ElMessage.success('派单成功！打印机开始工作')
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
.job-queue {
  display: flex;
  flex-direction: column;
  gap: var(--ep-space-6);
}

.queue-card {
  border-radius: var(--ep-border-radius-large);
  box-shadow: var(--ep-box-shadow-base);
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: calc(100vh - 180px);
}

.queue-card:hover {
  box-shadow: var(--ep-box-shadow-medium);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: var(--ep-space-3);
  font-size: var(--el-font-size-large);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

/* Table Styles */
.custom-table {
  border-radius: var(--ep-border-radius-medium);
  overflow: hidden;
}

.job-id {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: var(--el-color-primary);
}

.nozzle-req {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.priority-tag {
  min-width: 40px;
  text-align: center;
}

.status-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ep-space-2);
}

.status-icon {
  font-size: 14px;
}

.status-icon.rotating {
  animation: rotate 1s linear infinite;
}

.status-icon.warning {
  color: var(--el-color-warning);
}

.status-icon.primary {
  color: var(--el-color-primary);
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.time-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ep-space-2);
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-small);
}

/* Dialog Styles */
.assign-dialog :deep(.el-dialog__header) {
  padding: var(--ep-space-6);
  border-bottom: 1px solid var(--el-border-color-light);
}

.assign-dialog :deep(.el-dialog__body) {
  padding: var(--ep-space-6);
}

.assign-dialog :deep(.el-dialog__footer) {
  padding: var(--ep-space-4) var(--ep-space-6);
  border-top: 1px solid var(--el-border-color-light);
}

.dialog-info {
  margin-bottom: var(--ep-space-5);
}

.printer-option {
  display: flex;
  flex-direction: column;
  padding: var(--ep-space-2) 0;
}

.printer-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.printer-meta {
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--ep-space-3);
}

.mt-3 {
  margin-top: var(--ep-space-3);
}

/* Responsive */
@media (max-width: 768px) {
  .header-title {
    font-size: var(--el-font-size-base);
  }
}
</style>
