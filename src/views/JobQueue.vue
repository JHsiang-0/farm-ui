<template>
  <div class="h-full bg-gray-50 flex flex-col overflow-hidden">
    <el-card class="shadow-sm rounded-xl flex-1 flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 m-6">
      <template #header>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3 text-lg font-semibold text-gray-900">
            <el-icon :size="20" class="text-gray-600"><list /></el-icon>
            <span>生产调度队列</span>
          </div>
          <el-button type="default" @click="fetchQueue" :loading="loading">
            <el-icon><refresh /></el-icon>
            刷新队列
          </el-button>
        </div>
      </template>

      <el-table
        :data="queueData"
        v-loading="loading"
        style="width: 100%"
        class="rounded-lg overflow-hidden flex-1"
        :header-cell-style="{ background: '#f9fafb' }"
        height="calc(100vh - 280px)"
      >
        <el-table-column prop="id" label="任务单号" width="100" align="center">
          <template #default="scope">
            <span class="font-mono font-semibold text-gray-700">#{{ scope.row.id }}</span>
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
            <span class="font-medium text-gray-700">{{ scope.row.nozzleSize ? scope.row.nozzleSize + 'mm' : '任意' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="priority" label="优先级" width="100" align="center">
          <template #default="scope">
            <el-tag
              :type="getPriorityType(scope.row.priority)"
              effect="dark"
              size="small"
              class="min-w-10 text-center"
            >
              {{ scope.row.priority }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="140" align="center">
          <template #default="scope">
            <div class="flex items-center justify-center gap-2">
              <el-icon v-if="scope.row.status === 'PENDING'" class="text-sm animate-spin"><loading /></el-icon>
              <el-icon v-else-if="scope.row.status === 'ASSIGNED'" class="text-sm text-yellow-600"><pointer /></el-icon>
              <el-icon v-else-if="scope.row.status === 'PRINTING'" class="text-sm text-gray-600"><printer /></el-icon>
              <el-icon v-else-if="scope.row.status === 'COMPLETED'" class="text-sm text-green-600"><check /></el-icon>
              <el-icon v-else-if="scope.row.status === 'FAILED'" class="text-sm text-red-600"><circle-close /></el-icon>
              <el-tag :type="getStatusType(scope.row.status)" effect="light" size="small">
                {{ getStatusLabel(scope.row.status) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" min-width="160" prop="createdAt" align="center">
          <template #default="scope">
            <div class="flex items-center justify-center gap-2 text-sm text-gray-600">
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
              :disabled="scope.row.status !== 'PENDING'"
            >
              <el-icon><promotion /></el-icon>
              分配机器
            </el-button>
            <el-popconfirm
              title="确定要取消这个任务吗？"
              confirm-button-type="danger"
              @confirm="handleCancel(scope.row.id)"
              :disabled="scope.row.status === 'PRINTING' || scope.row.status === 'COMPLETED'"
            >
              <template #reference>
                <el-button size="small" type="danger" plain :disabled="scope.row.status === 'PRINTING' || scope.row.status === 'COMPLETED'">
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
          <el-icon :size="64" class="text-gray-400"><coffee /></el-icon>
        </template>
      </el-empty>
    </el-card>

    <!-- 指派打印机弹窗 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="指派打印机"
      width="520px"
      destroy-on-close
    >
      <div class="mb-5">
        <el-alert
          :title="`为任务 #${currentJob?.id} 选择打印机`"
          type="info"
          :closable="false"
          show-icon
        />
      </div>

      <el-form label-width="100px">
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
              <div class="flex flex-col py-2">
                <span class="font-medium text-gray-900">{{ printer.name }}</span>
                <span class="text-sm text-gray-600 mt-0.5">IP: {{ printer.ipAddress }} | 耗材: {{ printer.currentMaterial }}</span>
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
        <div class="flex justify-end gap-3">
          <el-button @click="assignDialogVisible = false">取消</el-button>
          <el-button
            type="success"
            @click="submitAssign"
            :disabled="!selectedPrinterId"
            :loading="assigning"
          >
            <el-icon><check /></el-icon>
            确认分配
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
    'PENDING': 'primary',
    'ASSIGNED': 'warning',
    'PRINTING': 'success',
    'COMPLETED': 'info',
    'FAILED': 'danger'
  }
  return map[status] || 'info'
}

// 获取状态显示文本
const getStatusLabel = (status) => {
  const map = {
    'PENDING': '待调度',
    'ASSIGNED': '已分配',
    'PRINTING': '打印中',
    'COMPLETED': '已完成',
    'FAILED': '已失败'
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
    ElMessage.success('任务分配成功！请等待操作员确认安全后启动打印')
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
