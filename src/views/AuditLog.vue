<template>
  <div class="app-page-shell app-page-background">
    <div class="app-page-toolbar mb-4">
      <h1 class="app-page-toolbar__title app-route-title">操作日志</h1>
      <div class="app-page-toolbar__actions">
        <t-button :icon="renderIcon(Refresh)" :loading="loading" @click="fetchData">刷新</t-button>
      </div>
    </div>

    <t-card class="app-page-card management-card">
      <t-form :data="query" layout="inline" label-align="top" class="app-query-toolbar">
        <t-form-item label="操作者 ID">
          <t-input v-model="query.actorId" placeholder="操作者 ID" clearable style="width: 130px" @enter="handleQuery" />
        </t-form-item>
        <t-form-item label="动作">
          <t-input v-model="query.action" placeholder="如 JOB_CREATE" clearable style="width: 180px" @enter="handleQuery" />
        </t-form-item>
        <t-form-item label="目标类型">
          <t-input v-model="query.targetType" placeholder="目标类型" clearable style="width: 140px" @enter="handleQuery" />
        </t-form-item>
        <t-form-item label="目标 ID">
          <t-input v-model="query.targetId" placeholder="目标 ID" clearable style="width: 140px" @enter="handleQuery" />
        </t-form-item>
        <t-form-item label="结果">
          <t-select v-model="query.result" placeholder="全部结果" clearable style="width: 120px" @change="handleQuery">
            <t-option label="成功" value="SUCCESS" />
            <t-option label="失败" value="FAILURE" />
          </t-select>
        </t-form-item>
        <t-form-item label="时间范围">
          <t-date-range-picker
            v-model="query.dateRange"
            value-type="YYYY-MM-DD HH:mm:ss"
            :default-time="['00:00:00', '23:59:59']"
            :placeholder="['开始时间', '结束时间']"
            separator="至"
            style="width: 280px"
          />
        </t-form-item>
        <t-form-item label="操作">
          <div class="flex gap-2">
            <t-button theme="primary" :loading="loading" @click="handleQuery">查询</t-button>
            <t-button @click="handleReset">重置</t-button>
          </div>
        </t-form-item>
      </t-form>

      <AsyncState
        v-if="loading || loadError || logs.length === 0"
        :loading="loading"
        :error="loadError"
        :empty="logs.length === 0"
        empty-description="暂无操作日志"
        @retry="fetchData"
      />
      <TdTable v-else :data="logs" :loading="loading" class="management-table" @row-click="openDetail">
        <TdTableColumn prop="actorUsername" label="操作者" min-width="140">
          <template #default="{ row }">
            <span>{{ row.actorUsername || (row.actorId ? `用户 #${row.actorId}` : '未识别用户') }}</span>
          </template>
        </TdTableColumn>
        <TdTableColumn prop="actorRole" label="角色" width="110">
          <template #default="{ row }">
            <t-tag size="small" variant="light-outline">{{ row.actorRole || '-' }}</t-tag>
          </template>
        </TdTableColumn>
        <TdTableColumn prop="action" label="动作" min-width="180">
          <template #default="{ row }"><span class="font-mono text-sm">{{ row.action || '-' }}</span></template>
        </TdTableColumn>
        <TdTableColumn prop="targetType" label="目标" min-width="180">
          <template #default="{ row }">
            <span>{{ row.targetType || '-' }}{{ row.targetId ? ` #${row.targetId}` : '' }}</span>
            <span v-if="row.targetLabel" class="block text-xs text-gray-500">{{ row.targetLabel }}</span>
          </template>
        </TdTableColumn>
        <TdTableColumn prop="occurredAt" label="发生时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.occurredAt) }}</template>
        </TdTableColumn>
        <TdTableColumn prop="result" label="结果" width="100">
          <template #default="{ row }">
            <t-tag :theme="row.result === 'SUCCESS' ? 'success' : 'danger'" size="small">
              {{ row.result === 'SUCCESS' ? '成功' : '失败' }}
            </t-tag>
          </template>
        </TdTableColumn>
        <TdTableColumn label="详情" width="90">
          <template #default="{ row }"><t-button variant="text" size="small" @click.stop="openDetail(row)">查看</t-button></template>
        </TdTableColumn>
      </TdTable>

      <t-pagination
        v-model:current="pagination.pageNum"
        v-model:pageSize="pagination.pageSize"
        :total="pagination.total"
        :page-size-options="[10, 20, 50, 100]"
        class="mt-4 justify-center"
        @change="handlePaginationChange"
      />
    </t-card>

    <t-drawer v-model:visible="detailVisible" header="审计日志详情" :footer="false" size="480px">
      <t-alert class="mb-4" theme="info" :close-btn="false">仅展示后端审计安全视图中的白名单字段。</t-alert>
      <t-descriptions v-if="selectedLog" bordered :column="1">
        <t-descriptions-item label="日志 ID">{{ selectedLog.id || '—' }}</t-descriptions-item>
        <t-descriptions-item label="操作者">{{ selectedLog.actorUsername || '—' }}（{{ selectedLog.actorId || '—' }}）</t-descriptions-item>
        <t-descriptions-item label="角色">{{ selectedLog.actorRole || '—' }}</t-descriptions-item>
        <t-descriptions-item label="动作">{{ selectedLog.action || '—' }}</t-descriptions-item>
        <t-descriptions-item label="目标类型">{{ selectedLog.targetType || '—' }}</t-descriptions-item>
        <t-descriptions-item label="目标 ID">{{ selectedLog.targetId || '—' }}</t-descriptions-item>
        <t-descriptions-item label="目标名称">{{ selectedLog.targetLabel || '—' }}</t-descriptions-item>
        <t-descriptions-item label="结果">{{ selectedLog.result || '—' }}</t-descriptions-item>
        <t-descriptions-item label="错误码">{{ selectedLog.errorCode || '—' }}</t-descriptions-item>
        <t-descriptions-item label="发生时间">{{ formatDateTime(selectedLog.occurredAt) }}</t-descriptions-item>
        <t-descriptions-item label="追踪 ID">{{ selectedLog.traceId || '—' }}</t-descriptions-item>
      </t-descriptions>
    </t-drawer>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { RefreshIcon as Refresh } from 'tdesign-icons-vue-next'
import { getAuditLogs } from '@/api/user'
import AsyncState from '@/components/AsyncState.vue'
import TdTable from '@/components/TdTable.vue'
import TdTableColumn from '@/components/TdTableColumn.vue'
import { formatDateTime } from '@/utils/formatters'
import { message } from '@/utils/message'
import { renderIcon } from '@/utils/tdesign'

defineOptions({ name: 'AuditLog' })

const loading = ref(false)
const loadError = ref('')
const logs = ref([])
const detailVisible = ref(false)
const selectedLog = ref(null)
const query = reactive({ actorId: '', action: '', targetType: '', targetId: '', result: '', dateRange: [] })
const pagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })

const buildParams = () => {
  const params = {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
    actorId: query.actorId.trim() || undefined,
    action: query.action.trim() || undefined,
    targetType: query.targetType.trim() || undefined,
    targetId: query.targetId.trim() || undefined,
    result: query.result || undefined
  }
  if (query.dateRange.length === 2) {
    params.from = query.dateRange[0]
    params.to = query.dateRange[1]
  }
  return params
}

const fetchData = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const response = await getAuditLogs(buildParams())
    logs.value = response.data?.records || []
    pagination.total = response.data?.total || 0
  } catch (error) {
    loadError.value = error?.message || '操作日志加载失败，请重试'
    message.error(loadError.value)
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  pagination.pageNum = 1
  fetchData()
}

const handleReset = () => {
  Object.assign(query, { actorId: '', action: '', targetType: '', targetId: '', result: '', dateRange: [] })
  pagination.pageNum = 1
  fetchData()
}

const handlePaginationChange = ({ current, pageSize }) => {
  pagination.pageNum = current
  pagination.pageSize = pageSize
  fetchData()
}

const openDetail = row => {
  selectedLog.value = row
  detailVisible.value = true
}

fetchData()
</script>
