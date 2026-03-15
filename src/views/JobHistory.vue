<template>
  <div class="h-full bg-gray-50 flex flex-col overflow-hidden">
    <el-card class="shadow-sm rounded-xl flex-1 flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 m-6">
      <template #header>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3 text-lg font-semibold text-gray-900">
            <el-icon :size="20" class="text-gray-600"><document /></el-icon>
            <span>打印历史记录</span>
          </div>
          <el-button type="default" @click="handleQuery" :loading="loading">
            <el-icon><refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </template>

      <!-- 顶部检索区 -->
      <div class="bg-gray-50 p-4 rounded-lg mb-4">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-700 whitespace-nowrap">任务状态</span>
            <el-select v-model="queryForm.status" placeholder="请选择状态" clearable style="width: 160px">
              <el-option label="待分配" value="PENDING" />
              <el-option label="排队中" value="QUEUED" />
              <el-option label="已分配待确认" value="ASSIGNED" />
              <el-option label="已上传待机" value="READY" />
              <el-option label="打印中" value="PRINTING" />
              <el-option label="已暂停" value="PAUSED" />
              <el-option label="已完成" value="COMPLETED" />
              <el-option label="失败" value="FAILED" />
              <el-option label="已取消" value="CANCELLED" />
            </el-select>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-700 whitespace-nowrap">时间范围</span>
            <el-date-picker
              v-model="queryForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 280px"
              :default-time="['00:00:00', '23:59:59']"
            />
          </div>

          <div class="flex items-center gap-2 ml-auto">
            <el-button type="primary" @click="handleQuery" :loading="loading">
              <el-icon><search /></el-icon>
              查询
            </el-button>
            <el-button @click="handleReset">
              <el-icon><refresh /></el-icon>
              重置
            </el-button>
          </div>
        </div>
      </div>

      <!-- 数据表格区 -->
      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
        class="rounded-lg overflow-hidden flex-1"
        :header-cell-style="{ background: '#f9fafb' }"
        height="calc(100vh - 480px)"
      >
        <el-table-column prop="id" label="任务ID" width="100" align="center">
          <template #default="scope">
            <span class="font-mono font-semibold text-gray-700">#{{ scope.row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="fileId" label="关联文件ID" width="100" align="center">
          <template #default="scope">
            <el-tag size="small" effect="plain">{{ scope.row.fileId }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="printerId" label="分配设备ID" width="100" align="center">
          <template #default="scope">
            <el-tag size="small" effect="plain" v-if="scope.row.printerId">{{ scope.row.printerId }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="120" align="center">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" effect="light" size="small">
              {{ getStatusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="progress" label="打印进度" width="140" align="center">
          <template #default="scope">
            <el-progress
              :percentage="scope.row.progress"
              :status="getProgressStatus(scope.row.status, scope.row.progress)"
              :stroke-width="6"
              :show-text="true"
            />
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

        <el-table-column label="结束时间" min-width="160" prop="endedAt" align="center">
          <template #default="scope">
            <div class="flex items-center justify-center gap-2 text-sm text-gray-600">
              <el-icon><timer /></el-icon>
              <span>{{ scope.row.endedAt ? formatTime(scope.row.endedAt) : '-' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="errorReason" label="报错原因" min-width="180" show-overflow-tooltip>
          <template #default="scope">
            <span v-if="scope.row.errorReason" class="text-red-600 text-sm">{{ scope.row.errorReason }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="scope">
            <el-popconfirm
              title="确定要取消这个任务吗？"
              confirm-button-type="danger"
              @confirm="handleCancel(scope.row.id)"
              :disabled="!canCancel(scope.row.status)"
            >
              <template #reference>
                <el-button
                  size="small"
                  type="danger"
                  plain
                  :disabled="!canCancel(scope.row.status)"
                >
                  <el-icon><circle-close /></el-icon>
                  取消
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <el-empty
        v-if="tableData.length === 0 && !loading"
        description="暂无打印历史记录"
      >
        <template #image>
          <el-icon :size="64" class="text-gray-400"><document /></el-icon>
        </template>
      </el-empty>

      <!-- 底部分页区 -->
      <div class="mt-4 flex justify-center px-4">
        <el-pagination
          v-model:current-page="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          background
          :total="pagination.total"
          layout="total, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import {
  Document,
  Refresh,
  Search,
  Clock,
  Timer,
  CircleClose
} from '@element-plus/icons-vue'
import { getJobPage, cancelJob } from '@/api/job'
import { ElMessage } from 'element-plus'

defineOptions({ name: 'JobHistory' })

const loading = ref(false)
const tableData = ref([])

// 查询表单
const queryForm = reactive({
  status: '',
  dateRange: [],
  printerId: ''
})

// 分页信息
const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0
})

// 获取状态标签类型
const getStatusType = (status) => {
  const map = {
    'PENDING': 'primary',
    'QUEUED': 'primary',
    'ASSIGNED': 'warning',
    'READY': 'info',
    'PRINTING': 'success',
    'PAUSED': 'warning',
    'COMPLETED': 'success',
    'FAILED': 'danger',
    'CANCELLED': 'info'
  }
  return map[status] || 'info'
}

// 获取状态显示文本
const getStatusLabel = (status) => {
  const map = {
    'PENDING': '待分配',
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
  const cancelableStatuses = ['PENDING', 'QUEUED', 'ASSIGNED', 'READY', 'PAUSED']
  return cancelableStatuses.includes(status)
}

// 获取进度条状态
const getProgressStatus = (status, progress) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'FAILED') return 'exception'
  if (status === 'PAUSED' || status === 'CANCELLED') return 'warning'
  if (progress === 100) return 'success'
  return ''
}

// 取消任务
const handleCancel = async (id) => {
  try {
    await cancelJob(id)
    ElMessage.success('任务已取消')
    fetchData()
  } catch (error) {
    console.error('取消任务失败:', error)
    ElMessage.error('取消任务失败')
  }
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

// 构建请求参数
const buildParams = () => {
  const params = {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize
  }

  if (queryForm.status) {
    params.status = queryForm.status
  }

  if (queryForm.dateRange && queryForm.dateRange.length === 2) {
    params.startTime = queryForm.dateRange[0]
    params.endTime = queryForm.dateRange[1]
  }

  if (queryForm.printerId) {
    params.printerId = queryForm.printerId
  }

  return params
}

// 查询数据
const handleQuery = async () => {
  pagination.pageNum = 1
  await fetchData()
}

// 重置查询
const handleReset = () => {
  queryForm.status = ''
  queryForm.dateRange = []
  queryForm.printerId = ''
  pagination.pageNum = 1
  fetchData()
}

// 分页大小改变
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.pageNum = 1
  fetchData()
}

// 页码改变
const handleCurrentChange = (page) => {
  pagination.pageNum = page
  fetchData()
}

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const params = buildParams()
    const res = await getJobPage(params)
    if (res.code === 200 && res.data) {
      tableData.value = res.data.records || []
      pagination.total = res.data.total || 0
    } else {
      ElMessage.error(res.message || '获取数据失败')
    }
  } catch (error) {
    console.error('获取打印历史记录失败:', error)
    ElMessage.error('获取打印历史记录失败')
  } finally {
    loading.value = false
  }
}

// 初始化数据
fetchData()
</script>

