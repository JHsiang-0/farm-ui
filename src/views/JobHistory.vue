<template>
  <div class="h-full bg-gray-50 flex flex-col overflow-hidden">
    <t-card class="shadow-sm rounded-xl flex-1 flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 m-6">
      <template #header>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3 text-lg font-semibold text-gray-900">
            <document :size="20" class="text-gray-600" />
            <span>打印历史记录</span>
          </div>
          <t-button theme="default" @click="handleQuery" :loading="loading">
            <span><refresh /></span>
            刷新数据
          </t-button>
        </div>
      </template>

      <!-- 顶部检索区 -->
      <div class="bg-gray-50 p-4 rounded-lg mb-4">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-700 whitespace-nowrap">任务状态</span>
            <t-select v-model="queryForm.status" placeholder="请选择状态" clearable style="width: 160px">
              <t-option label="排队中" value="QUEUED" />
              <t-option label="已分配待确认" value="ASSIGNED" />
              <t-option label="已上传待机" value="READY" />
              <t-option label="打印中" value="PRINTING" />
              <t-option label="已暂停" value="PAUSED" />
              <t-option label="已完成" value="COMPLETED" />
              <t-option label="失败" value="FAILED" />
              <t-option label="已取消" value="CANCELLED" />
            </t-select>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-700 whitespace-nowrap">时间范围</span>
            <t-date-range-picker
              v-model="queryForm.dateRange"
              separator="至"
              :placeholder="['开始日期', '结束日期']"
              value-type="YYYY-MM-DD HH:mm:ss"
              style="width: 280px"
              :default-time="['00:00:00', '23:59:59']"
            />
          </div>

          <div class="flex items-center gap-2 ml-auto">
            <t-button theme="primary" @click="handleQuery" :loading="loading">
              <span><search /></span>
              查询
            </t-button>
            <t-button @click="handleReset">
              <span><refresh /></span>
              重置
            </t-button>
          </div>
        </div>
      </div>

      <!-- 数据表格区 -->
      <TdTable
        :data="tableData"
        :loading="loading"
        style="width: 100%"
        class="rounded-lg overflow-hidden flex-1"
        :header-cell-style="{ background: '#f9fafb' }"
        height="calc(100vh - 480px)"
      >
        <TdTableColumn prop="id" label="任务ID" width="100" align="center">
          <template #default="scope">
            <span class="font-mono font-semibold text-gray-700">#{{ scope.row.id }}</span>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="fileId" label="关联文件ID" width="100" align="center">
          <template #default="scope">
            <t-tag size="small" variant="light-outline">{{ scope.row.fileId }}</t-tag>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="printerId" label="分配设备ID" width="100" align="center">
          <template #default="scope">
            <t-tag size="small" variant="light-outline" v-if="scope.row.printerId">{{ scope.row.printerId }}</t-tag>
            <span v-else>-</span>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="status" label="状态" width="120" align="center">
          <template #default="scope">
            <t-tag :theme="getStatusType(scope.row.status)" variant="light" size="small">
              {{ getStatusLabel(scope.row.status) }}
            </t-tag>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="progress" label="打印进度" width="140" align="center">
          <template #default="scope">
            <t-progress
              :percentage="scope.row.progress"
              :status="getProgressStatus(scope.row.status, scope.row.progress)"
              :stroke-width="6"
              :label="true"
            />
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

        <TdTableColumn label="结束时间" min-width="160" prop="endedAt" align="center">
          <template #default="scope">
            <div class="flex items-center justify-center gap-2 text-sm text-gray-600">
              <span><timer /></span>
              <span>{{ scope.row.endedAt ? formatDateTime(scope.row.endedAt) : '-' }}</span>
            </div>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="errorReason" label="报错原因" min-width="180" show-overflow-tooltip>
          <template #default="scope">
            <span v-if="scope.row.errorReason" class="text-red-600 text-sm">{{ scope.row.errorReason }}</span>
            <span v-else>-</span>
          </template>
        </TdTableColumn>

        <TdTableColumn label="操作" width="120" align="center" fixed="right">
          <template #default="scope">
            <t-popconfirm content="确定要取消这个任务吗？"
              theme="danger"
              @confirm="handleCancel(scope.row.id)"
              :disabled="!canCancel(scope.row.status)"
            >
              <template>
                <t-button
                  size="small" theme="danger" variant="outline"
                  :disabled="!canCancel(scope.row.status)"
                >
                  <span><circle-close /></span>
                  取消
                </t-button>
              </template>
            </t-popconfirm>
          </template>
        </TdTableColumn>
      </TdTable>

      <!-- 空状态 -->
      <t-empty
        v-if="tableData.length === 0 && !loading"
        description="暂无打印历史记录"
      >
        <template #image>
          <document :size="64" class="text-gray-400" />
        </template>
      </t-empty>

      <!-- 底部分页区 -->
      <div class="mt-4 flex justify-center px-4">
        <t-pagination
          v-model:current="pagination.pageNum"
          v-model:pageSize="pagination.pageSize"
          :total="pagination.total"
          :show-page-size="false"
          @change="handlePaginationChange"
        />
      </div>
    </t-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import {
  FileIcon as Document,
  RefreshIcon as Refresh,
  SearchIcon as Search,
  TimeIcon as Clock,
  TaskTimeIcon as Timer,
  CloseCircleIcon as CircleClose
} from 'tdesign-icons-vue-next'
import { getJobPage, cancelJob } from '@/api/job'
import { message } from '@/utils/message'
import { formatDateTime } from '@/utils/formatters'
import TdTable from '@/components/TdTable.vue'
import TdTableColumn from '@/components/TdTableColumn.vue'

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
    'QUEUED': 'primary',
    'ASSIGNED': 'warning',
    'READY': 'default',
    'PRINTING': 'success',
    'PAUSED': 'warning',
    'COMPLETED': 'success',
    'FAILED': 'danger',
    'CANCELLED': 'default'
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
    message.success('任务已取消')
    fetchData()
  } catch (error) {
    console.error('取消任务失败:', error)
    message.error('取消任务失败')
  }
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

// TDesign 分页在页码或每页条数变化时统一返回分页信息。
const handlePaginationChange = ({ current, pageSize }) => {
  pagination.pageNum = current
  pagination.pageSize = pageSize
  fetchData()
}

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const params = buildParams()
    const res = await getJobPage(params)
    if (res.code === 200) {
      // 成功响应允许 data=null，按空结果处理，不提示接口异常。
      tableData.value = res.data?.records || []
      pagination.total = res.data?.total || 0
    } else {
      message.error(res.message || '获取数据失败')
    }
  } catch (error) {
    console.error('获取打印历史记录失败:', error)
    message.error('获取打印历史记录失败')
  } finally {
    loading.value = false
  }
}

// 初始化数据
fetchData()
</script>
