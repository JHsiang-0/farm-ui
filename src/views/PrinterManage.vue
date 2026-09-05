<template>
  <div class="app-page-shell app-page-background relative">
    <!-- 设备详情抽屉 -->
    <DeviceDetailDrawer
      v-model="detailDrawerVisible"
      :device="selectedDevice"
      :real-time-data="selectedDeviceRealTimeData"
      @closed="clearPrinterDetailContext"
    />

    <!-- 页面标题与操作栏 -->
    <div class="app-page-toolbar mb-4">
      <h1 class="app-page-toolbar__title app-route-title">打印机管理</h1>
      <div class="app-page-toolbar__actions">
        <t-button :icon="renderIcon(Refresh)" :loading="loading" @click="fetchData" size="medium">
          刷新
        </t-button>
        <t-button v-if="isAdmin" theme="warning" @click="openScanDialog">
          <span><aim /></span>
          扫描局域网设备
        </t-button>
        <t-button v-if="isAdmin" theme="success" @click="handleAdd">
          <span><plus /></span>
          新增打印机
        </t-button>
      </div>
    </div>

    <!-- 状态标签与设备列表 -->
    <t-card class="printer-manage-card app-page-card shadow-sm rounded-xl hover:shadow-md transition-shadow duration-200">
      <div class="printer-manage-card__status-panel">
        <nav class="printer-status-tabs" aria-label="打印机状态筛选">
          <button
            v-for="tab in printerStatusTabs"
            :key="tab.key || 'all'"
            type="button"
            class="printer-status-tab"
            :class="{ 'printer-status-tab--active': activeStatusFilterKey === tab.key }"
            @click="applyStatusFilter(tab.key)"
          >
            <span v-if="tab.key === 'ATTENTION'" class="printer-status-tab__dot" />
            <span>{{ tab.label }}</span>
            <span class="printer-status-tab__count">{{ tab.count }}</span>
          </button>
        </nav>
        <div class="printer-manage-card__hint">
          <span>共 {{ printerSummary.total }} 台设备</span>
          <t-tag v-if="activeStatusFilter" :theme="activeStatusFilter.theme" variant="light" size="small">
            当前：{{ activeStatusFilter.label }}
          </t-tag>
        </div>
      </div>

      <div class="printer-filter-toolbar">
        <t-input
          v-model="nameKeyword"
          class="printer-filter-toolbar__search"
          clearable
          placeholder="搜索打印机名称..."
          @clear="handleSearch"
          @enter="handleSearch"
        >
          <template #prefixIcon>
            <span><search /></span>
          </template>
        </t-input>
        <span class="printer-filter-toolbar__tip">点击设备行可查看详情</span>
        <t-button variant="outline" size="small" @click="handleResetFilters">
          重置筛选
        </t-button>
      </div>

      <div class="printer-manage-card__table flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
        <TdTable
          :data="tableData"
          :loading="loading"
          style="width: 100%"
          class="printer-manage-table min-h-0 flex-1 overflow-hidden rounded-lg"
          :header-cell-style="{ background: '#f9fafb' }"
          @row-click="handleRowClick"
          row-class-name="cursor-pointer hover:bg-gray-50"
          height="100%"
        >
        <TdTableColumn prop="id" label="ID" width="68" align="center">
          <template #default="scope">
            <span class="font-mono font-semibold text-gray-600">{{ scope.row.id }}</span>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="name" label="打印机" min-width="180">
          <template #default="scope">
            <div class="printer-table-primary">
              <div class="flex items-center gap-2 font-medium text-gray-900">
                <printer :size="16" :stroke-color="getStatusColor(scope.row.status)" />
                <span class="truncate" :title="scope.row.name">{{ scope.row.name }}</span>
              </div>
              <span class="printer-table-secondary">
                {{ scope.row.machineNumber || `#${scope.row.id}` }}
              </span>
            </div>
          </template>
        </TdTableColumn>

        <TdTableColumn label="网络与协议" width="135">
          <template #default="scope">
            <div class="printer-table-primary">
              <span class="printer-table-secondary">{{ scope.row.ipAddress || '-' }}</span>
              <span class="printer-table-secondary printer-table-secondary--muted">
                {{ scope.row.firmwareType || '未配置协议' }}
              </span>
            </div>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="status" label="运行状态" width="104" align="center">
          <template #default="scope">
            <t-tag :theme="getStatusType(scope.row.status)" variant="light" size="small">
              {{ getStatusLabel(scope.row.status) }}
            </t-tag>
          </template>
        </TdTableColumn>

        <TdTableColumn label="任务 / 安全" min-width="190">
          <template #default="scope">
            <div class="printer-table-primary">
              <span v-if="scope.row.currentJobId" class="truncate text-sm text-gray-800" :title="scope.row.currentJobFileName || `任务 #${scope.row.currentJobId}`">
                {{ scope.row.currentJobFileName || `任务 #${scope.row.currentJobId}` }}
              </span>
              <span v-else class="printer-table-secondary printer-table-secondary--muted">暂无任务</span>
              <span class="printer-table-inline-status">
                <circle-check v-if="scope.row.isSafeToPrint" :size="13" stroke-color="#059669" />
                <circle-close v-else :size="13" stroke-color="#dc2626" />
                <span :class="scope.row.isSafeToPrint ? 'text-emerald-600' : 'text-red-500'">
                  {{ scope.row.isSafeToPrint ? '热床已清理' : '热床待清理' }}
                </span>
              </span>
            </div>
          </template>
        </TdTableColumn>

        <TdTableColumn label="耗材 / 喷嘴" width="118" align="center">
          <template #default="scope">
            <div class="printer-table-primary printer-table-primary--center">
              <t-tag size="small" theme="warning" variant="light">
                {{ scope.row.currentMaterial || '未装载' }}
              </t-tag>
              <span class="printer-table-secondary">{{ scope.row.nozzleSize || '-' }} mm</span>
            </div>
          </template>
        </TdTableColumn>

        <TdTableColumn label="操作" width="156" align="center" fixed="right">
          <template #default="scope">
            <div class="printer-action-group flex items-center justify-center gap-1">
              <!-- 确认热床已清理按钮 -->
              <t-button
                v-if="shouldShowSafeButton(scope.row)"
                size="small" theme="warning"
                @click.stop="handleConfirmSafe(scope.row)"
                :loading="confirmingSafeIds.includes(scope.row.id)"
              >
                <span><check /></span>
                确认清理
              </t-button>
              <!-- 启动打印按钮 -->
              <t-button
                v-if="shouldShowStartButton(scope.row)"
                size="small" theme="success"
                @click.stop="handleStartJob(scope.row)"
                :loading="startingJobIds.includes(scope.row.id)"
              >
                <span><printer /></span>
                启动打印
              </t-button>
              <!-- 编辑按钮 -->
              <t-button v-if="isAdmin" size="small" theme="primary" @click.stop="handleEdit(scope.row)">
                <span><edit /></span>
                编辑
              </t-button>
              <!-- 删除按钮 -->
              <t-popconfirm v-if="isAdmin" content="确定要删除这台机器吗？"
                theme="danger"
                @click.stop
                @confirm="handleDelete(scope.row.id)"
              >
                <template>
                  <t-button size="small" theme="danger" variant="outline" @click.stop>
                    <span><delete /></span>
                  </t-button>
                </template>
              </t-popconfirm>
            </div>
          </template>
        </TdTableColumn>
        </TdTable>
      </div>

      <div class="printer-manage-card__footer app-pagination-footer">
        <t-pagination
          v-model:current="queryParams.pageNum"
          v-model:pageSize="queryParams.pageSize"
          :total="total"
          :show-page-size="false"
          @change="fetchData"
        />
      </div>
    </t-card>

    <!-- 新增/编辑弹窗 -->
    <t-dialog v-model:visible="dialogVisible" :header="isEdit ? '编辑打印机' : '新增打印机'"
      width="520px"
      destroy-on-close
    >
      <t-form :data="form" :rules="rules" ref="formRef" label-width="100px">
        <t-form-item label="机器名称" name="name">
          <t-input v-model="form.name" placeholder="例：Klipper-01">
            <template #prefixIcon>
              <span><printer /></span>
            </template>
          </t-input>
        </t-form-item>

        <t-form-item label="IP 地址" name="ipAddress">
          <t-input v-model="form.ipAddress" placeholder="例：192.168.1.10">
            <template #prefixIcon>
              <span><link /></span>
            </template>
          </t-input>
        </t-form-item>

        <t-form-item label="设备协议" name="firmwareType">
          <t-select v-model="form.firmwareType" placeholder="请选择设备协议" style="width: 100%">
            <t-option label="RRF 3.7" value="RRF" />
            <t-option label="Klipper / Moonraker" value="KLIPPER" />
          </t-select>
        </t-form-item>

        <t-form-item label="当前耗材" name="currentMaterial">
          <t-select v-model="form.currentMaterial" placeholder="请选择装载耗材" style="width: 100%">
            <t-option label="PLA" value="PLA" />
            <t-option label="PETG" value="PETG" />
            <t-option label="ABS" value="ABS" />
            <t-option label="TPU" value="TPU" />
          </t-select>
        </t-form-item>

        <t-form-item label="喷嘴大小" name="nozzleSize">
          <div class="flex items-center gap-3">
            <t-input-number
              v-model="form.nozzleSize"
              :precision="2"
              :step="0.1"
              :min="0.2"
              :max="1.2"
              style="width: 150px"
            />
            <span class="text-sm text-gray-600">mm</span>
          </div>
        </t-form-item>
      </t-form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <t-button @click="dialogVisible = false">取消</t-button>
          <t-button theme="primary" @click="submitForm" :loading="submitLoading">
            <span><check /></span>
            确定
          </t-button>
        </div>
      </template>
    </t-dialog>

    <!-- 扫描局域网设备弹窗 -->
    <t-dialog v-model:visible="scanDialogVisible" header="扫描局域网设备"
      width="800px"
      destroy-on-close
    >
      <!-- 扫描输入区 -->
      <div class="mb-4">
        <t-form label-width="90px">
          <t-form-item label="网段前缀">
            <t-input
              v-model="subnet"
              placeholder="例：192.168.1"
              size="medium"
              :disabled="isScanning"
            >
              <template #suffix>
                <t-button theme="primary"
                  @click="handleScan"
                  :loading="isScanning"
                >
                  <span><search /></span>
                  {{ isScanning ? '扫描中...' : '开始扫描' }}
                </t-button>
              </template>
            </t-input>
          </t-form-item>
        </t-form>
      </div>

      <!-- 加载状态 -->
      <div v-if="isScanning" class="text-center py-8">
        <t-skeleton :rows="5" animated />
        <p class="mt-4 text-sm text-gray-600">正在扫描局域网设备，请稍候...</p>
      </div>

      <!-- 扫描结果表格 -->
      <div v-else-if="scanResults.length > 0" class="bg-white rounded-lg">
        <!-- 统计文案 -->
        <div class="mb-4">
          <t-alert
            :title="scanStatsText" theme="info"
            :closable="false"

          />
        </div>

        <!-- 结果表格 -->
        <TdTable
          ref="scanTableRef"
          :data="scanResults"
          style="width: 100%"
          class="rounded-lg overflow-hidden"
          :header-cell-style="{ background: '#f9fafb' }"
          @selection-change="handleSelectionChange"
        >
          <TdTableColumn type="selection" width="50" align="center" />

          <TdTableColumn label="状态" width="120" align="center">
            <template #default="scope">
              <t-tag
                :theme="scope.row.isNewDevice ? 'success' : 'primary'"
                variant="light"
                size="small"
              >
                {{ scope.row.isNewDevice ? '全新设备' : '已知设备' }}
              </t-tag>
            </template>
          </TdTableColumn>

          <TdTableColumn label="MAC 地址" width="140" align="center">
            <template #default="scope">
              <span class="font-mono text-sm font-medium text-gray-700">{{ scope.row.macAddress }}</span>
            </template>
          </TdTableColumn>

          <TdTableColumn label="IP 地址" width="130" align="center">
            <template #default="scope">
              <t-tag size="small" variant="light-outline" theme="default">
                {{ scope.row.ipAddress }}
              </t-tag>
            </template>
          </TdTableColumn>

          <TdTableColumn label="机器名称" min-width="150">
            <template #default="scope">
              <t-input
                v-model="scope.row.name"
                size="small"
                placeholder="请输入机器名称"
              >
                <template #prefixIcon>
                  <span><printer /></span>
                </template>
              </t-input>
            </template>
          </TdTableColumn>

          <TdTableColumn label="建议名称" width="120" align="center">
            <template #default="scope">
              <span class="text-sm text-gray-600">{{ scope.row.suggestedName }}</span>
            </template>
          </TdTableColumn>
        </TdTable>
      </div>

      <!-- 空状态 -->
      <t-empty
        v-else-if="hasScanned && !isScanning"
        description="该网段未发现设备"

      >
        <template #description>
          <p>该网段未发现设备</p>
          <p class="mt-2 text-sm text-gray-400">请检查网段是否正确或设备是否在线</p>
        </template>
      </t-empty>

      <template #footer>
        <div class="flex justify-end gap-3">
          <t-button @click="scanDialogVisible = false">关闭</t-button>
          <t-button theme="success"
            :disabled="selectedDevices.length === 0"
            @click="handleBatchAdd"
            :loading="isBatchAdding"
          >
            <span><folder-add /></span>
            批量导入/同步 ({{ selectedDevices.length }})
          </t-button>
        </div>
      </template>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  RefreshIcon as Refresh,
  MapAimingIcon as Aim,
  AddIcon as Plus,
  PrintIcon as Printer,
  EditIcon as Edit,
  DeleteIcon as Delete,
  CheckIcon as Check,
  SearchIcon as Search,
  FolderAddIcon as FolderAdd,
  CheckCircleIcon as CircleCheck,
  CloseCircleIcon as CircleClose
} from 'tdesign-icons-vue-next'
import {
  getPrinterList,
  addPrinter,
  updatePrinter,
  deletePrinter,
  scanPrinters,
  batchAddPrinters,
  confirmSafe
} from '@/api/printer'
import { startJob } from '@/api/job'
import { message, confirmMessage } from '@/utils/message'
import { renderIcon } from '@/utils/tdesign'
import { useUserStore } from '@/stores/user'
import DeviceDetailDrawer from '@/components/device/DeviceDetailDrawer.vue'
import TdTable from '@/components/TdTable.vue'
import TdTableColumn from '@/components/TdTableColumn.vue'

defineOptions({ name: 'PrinterManage' })

// ===== 列表与分页状态 =====
const loading = ref(false)
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin)
const tableData = ref([])
const total = ref(0)
const queryParams = reactive({
  pageNum: 1,
  pageSize: 20,
  name: Array.isArray(route.query.name) ? route.query.name[0] : (route.query.name || '')
})
const nameKeyword = ref(queryParams.name)

const summaryData = ref([])
const summaryTotal = ref(null)
const statusFilterConfig = {
  PRINTING: { label: '打印中', theme: 'primary' },
  IDLE: { label: '空闲打印机', theme: 'success' },
  ATTENTION: { label: '异常设备', theme: 'danger' }
}
const attentionStatuses = new Set(['ERROR', 'OFFLINE', 'UNKNOWN', 'FAULT', 'SYS_ERROR', 'PRINT_ERROR'])

const activeStatusFilterKey = computed(() => {
  const value = Array.isArray(route.query.status) ? route.query.status[0] : route.query.status
  return statusFilterConfig[value] ? value : ''
})
const activeStatusFilter = computed(() => statusFilterConfig[activeStatusFilterKey.value] || null)

const printerSummary = computed(() => {
  const records = summaryData.value
  const totalCount = summaryTotal.value === null ? total.value : summaryTotal.value
  const printing = records.filter(item => String(item.status || '').toUpperCase() === 'PRINTING').length
  const idle = records.filter(item => ['IDLE', 'STANDBY'].includes(String(item.status || '').toUpperCase())).length
  const attention = records.filter(item => attentionStatuses.has(String(item.status || '').toUpperCase())).length

  return {
    total: totalCount,
    printing,
    idle,
    attention
  }
})

const printerStatusTabs = computed(() => [
  { key: '', label: '全部设备', count: printerSummary.value.total },
  { key: 'PRINTING', label: '打印中', count: printerSummary.value.printing },
  { key: 'IDLE', label: '空闲打印机', count: printerSummary.value.idle },
  { key: 'ATTENTION', label: '需要关注', count: printerSummary.value.attention }
])

// ===== 设备详情抽屉状态 =====
const detailDrawerVisible = ref(false)
const selectedDevice = ref(null)
const selectedDeviceRealTimeData = ref(null)
const PRINTER_DETAIL_CONTEXT_KEY = 'farm-ui:printer-detail'

// ===== 表单与弹窗状态 =====
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)

const defaultForm = {
  id: null,
  name: '',
  ipAddress: '',
  firmwareType: 'KLIPPER',
  currentMaterial: 'ABS',
  nozzleSize: 1.2
}
const form = reactive({ ...defaultForm })

const rules = {
  name: [{ required: true, message: '请输入机器名称', trigger: 'blur' }],
  ipAddress: [{ required: true, message: '请输入IP地址', trigger: 'blur' }]
}

// ===== 扫描状态 =====
const scanDialogVisible = ref(false)
const subnet = ref('192.168.1')
const isScanning = ref(false)
const hasScanned = ref(false)
const scanResults = ref([])
const isBatchAdding = ref(false)
const selectedDevices = ref([])
const scanTableRef = ref(null)

// ===== 现场操作状态 =====
const confirmingSafeIds = ref([])
const startingJobIds = ref([])

// 扫描统计文案
const scanStatsText = computed(() => {
  const total = scanResults.value.length
  const newCount = scanResults.value.filter(d => d.isNewDevice).length
  const existingCount = total - newCount
  return `共扫描到 ${total} 台设备，其中 ${newCount} 台新设备，${existingCount} 台已知设备`
})

// 获取状态对应颜色
const getStatusColor = (status) => {
  const map = {
    'PRINTING': '#1d4ed8',
    'IDLE': '#059669',
    'ERROR': '#dc2626',
    'OFFLINE': '#6b7280'
  }
  return map[status?.toUpperCase()] || '#6b7280'
}

// 获取状态标签类型
const getStatusType = (status) => {
  if (!status) return 'default'
  const map = {
    'PRINTING': 'primary',
    'IDLE': 'success',
    'ERROR': 'danger',
    'OFFLINE': 'default'
  }
  return map[status.toUpperCase()] || 'default'
}

const getStatusLabel = (status) => {
  const map = {
    OFFLINE: '离线',
    IDLE: '待机',
    PREPARING: '准备中',
    PRINTING: '打印中',
    PAUSED: '已暂停',
    ERROR: '错误',
    UNKNOWN: '未知'
  }
  return map[String(status || '').toUpperCase()] || '未知'
}

// 判断是否应该显示"确认清理"按钮
const shouldShowSafeButton = (printer) => {
  return printer.currentJobStatus === 'ASSIGNED' && !printer.isSafeToPrint
}

// 判断是否应该显示"启动打印"按钮
const shouldShowStartButton = (printer) => {
  return printer.currentJobStatus === 'ASSIGNED' && printer.isSafeToPrint && printer.currentJobId
}

// 确认热床已清理
const handleConfirmSafe = async (printer) => {
  try {
    await confirmMessage(
      `确认 ${printer.name} 热床已清理完毕，可以开始打印了吗？`,
      '安全确认',
      {
        confirmButtonText: '已确认清理',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    confirmingSafeIds.value.push(printer.id)
    await confirmSafe(printer.id)
    message.success('安全确认成功！')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('安全确认失败:', error)
    }
  } finally {
    const index = confirmingSafeIds.value.indexOf(printer.id)
    if (index > -1) {
      confirmingSafeIds.value.splice(index, 1)
    }
  }
}

// 启动打印
const handleStartJob = async (printer) => {
  if (!printer.currentJobId) {
    message.warning('该设备没有分配的任务')
    return
  }

  try {
    await confirmMessage(
      `确认启动 ${printer.name} 的打印任务 #${printer.currentJobId}？`,
      '启动打印确认',
      {
        confirmButtonText: '启动打印',
        cancelButtonText: '取消',
        type: 'primary'
      }
    )

    startingJobIds.value.push(printer.id)
    await startJob(printer.currentJobId)
    message.success('打印任务已启动！')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('启动打印失败:', error)
    }
  } finally {
    const index = startingJobIds.value.indexOf(printer.id)
    if (index > -1) {
      startingJobIds.value.splice(index, 1)
    }
  }
}

// 表格行点击事件
const handleRowClick = (row) => {
  selectedDevice.value = row
  sessionStorage.setItem(PRINTER_DETAIL_CONTEXT_KEY, String(row.id))
  // 为设备添加实时数据（这里可以根据实际情况获取真实数据）
  selectedDeviceRealTimeData.value = {
    state: row.currentJobStatus === 'ASSIGNED' ? 'ASSIGNED' : (row.status || 'IDLE'),
    currentJobId: row.currentJobId,
    currentJobFileName: row.currentJobFileName,
    toolTemperature: 0,
    bedTemperature: 0,
    printDuration: 0,
    filamentUsed: 0,
    progress: 0,
    systemMessage: ''
  }
  detailDrawerVisible.value = true
}

const clearPrinterDetailContext = () => {
  detailDrawerVisible.value = false
  sessionStorage.removeItem(PRINTER_DETAIL_CONTEXT_KEY)
  selectedDevice.value = null
  selectedDeviceRealTimeData.value = null
}

const restorePrinterDetailContext = () => {
  const printerId = sessionStorage.getItem(PRINTER_DETAIL_CONTEXT_KEY)
  if (!printerId || selectedDevice.value) return

  const printer = tableData.value.find(item => String(item.id) === printerId)
  if (printer) handleRowClick(printer)
}

// 加载分页数据
const fetchData = async () => {
  loading.value = true
  try {
    const res = await getPrinterList({
      ...queryParams,
      ...(activeStatusFilterKey.value ? { status: activeStatusFilterKey.value } : {})
    })
    tableData.value = res.data?.records || []
    total.value = res.data?.total || 0

    // 顶部状态统计始终使用未筛选的数据，避免切换分页或状态标签后数字失真。
    try {
      const summaryRes = await getPrinterList({
        pageNum: 1,
        pageSize: 100,
        ...(queryParams.name ? { name: queryParams.name } : {})
      })
      summaryData.value = summaryRes.data?.records || []
      summaryTotal.value = summaryRes.data?.total || 0
    } catch {
      // 统计请求失败时回退到当前列表，主列表仍可正常使用。
      summaryData.value = tableData.value
      summaryTotal.value = total.value
    }

    restorePrinterDetailContext()
  } catch {
    // 错误在拦截器处理
  } finally {
    loading.value = false
  }
}

const applyStatusFilter = (status) => {
  const query = { ...route.query }
  if (status) {
    query.status = status
  } else {
    delete query.status
  }
  queryParams.pageNum = 1
  router.replace({ path: route.path, query })
}

const handleSearch = () => {
  const name = nameKeyword.value.trim()
  const query = { ...route.query }
  queryParams.name = name
  queryParams.pageNum = 1
  if (name) {
    query.name = name
  } else {
    delete query.name
  }
  router.replace({ path: route.path, query })
}

const handleResetFilters = () => {
  nameKeyword.value = ''
  queryParams.name = ''
  queryParams.pageNum = 1
  const query = { ...route.query }
  delete query.name
  delete query.status
  router.replace({ path: route.path, query })
}

watch(() => [route.query.status, route.query.name], () => {
  queryParams.pageNum = 1
  queryParams.name = Array.isArray(route.query.name) ? route.query.name[0] : (route.query.name || '')
  nameKeyword.value = queryParams.name
  fetchData()
})

// 点击新增按钮
const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, defaultForm)
  dialogVisible.value = true
}

// 点击编辑按钮
const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    name: row.name,
    ipAddress: row.ipAddress,
    firmwareType: row.firmwareType || 'KLIPPER',
    currentMaterial: row.currentMaterial,
    nozzleSize: row.nozzleSize
  })
  dialogVisible.value = true
}

// 提交表单
const submitForm = async () => {
  await formRef.value.validate()
  submitLoading.value = true
  try {
    const payload = {
      id: form.id,
      name: form.name,
      ipAddress: form.ipAddress,
      firmwareType: form.firmwareType,
      currentMaterial: form.currentMaterial,
      nozzleSize: form.nozzleSize
    }

    if (isEdit.value) {
      await updatePrinter(payload)
      message.success('修改成功')
    } else {
      await addPrinter(payload)
      message.success('新增成功')
    }
    dialogVisible.value = false
    fetchData()
  } catch {
    // 错误在拦截器处理
  } finally {
    submitLoading.value = false
  }
}

// 删除数据
const handleDelete = async (id) => {
  try {
    await deletePrinter(id)
    message.success('删除成功')
    if (tableData.value.length === 1 && queryParams.pageNum > 1) {
      queryParams.pageNum--
    }
    fetchData()
  } catch {
    // 错误在拦截器处理
  }
}

// ===== 局域网扫描逻辑 =====
const openScanDialog = () => {
  scanResults.value = []
  selectedDevices.value = []
  hasScanned.value = false
  scanDialogVisible.value = true
}

// 表格多选变化
const handleSelectionChange = (selection) => {
  selectedDevices.value = selection
}

const handleScan = async () => {
  if (!subnet.value) {
    message.warning('请输入网段前缀')
    return
  }
  isScanning.value = true
  hasScanned.value = false
  selectedDevices.value = []
  try {
    const res = await scanPrinters(subnet.value)
    // 为每个设备添加 name 字段（默认使用 suggestedName）
    scanResults.value = (res.data || []).map(device => ({
      ...device,
      name: device.suggestedName || ''
    }))
    hasScanned.value = true
  } catch {
    // 拦截器处理错误
  } finally {
    isScanning.value = false
  }
}

const handleBatchAdd = async () => {
  if (selectedDevices.value.length === 0) return

  // 构造符合新 API 契约的请求体
  const devicesToSubmit = selectedDevices.value.map(device => ({
    ipAddress: device.ipAddress,
    macAddress: device.macAddress,
    name: device.name || device.suggestedName
  }))

  isBatchAdding.value = true
  try {
    const res = await batchAddPrinters(devicesToSubmit)
    // 解析后端返回的 message
    const result = res.data || {}
    const resultMessage = res.message || result.message || '批量处理完成'
    if (result.failedCount > 0) {
      message.warning(`${resultMessage}：成功 ${result.successCount || 0} 台，失败 ${result.failedCount} 台`)
    } else {
      message.success(resultMessage)
    }
    scanDialogVisible.value = false
    fetchData() // 刷新设备列表
  } catch (error) {
    // 拦截器会处理错误，但如果有特定错误信息可以在这里显示
    const errorMsg = error.response?.data?.message || '批量处理失败'
    message.error(errorMsg)
  } finally {
    isBatchAdding.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.printer-manage-card {
  height: 100%;
}

.printer-manage-card :deep(.t-card__body) {
  display: flex;
  flex: 1 1 0%;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.printer-manage-card__footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 2.5rem;
  margin-top: auto;
}

.printer-manage-card__footer :deep(.t-pagination) {
  width: 100%;
}

.printer-manage-card__table {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.printer-manage-table :deep(.t-table) {
  color: #374151;
  font-size: 0.8125rem;
}

.printer-manage-table :deep(.t-table th),
.printer-manage-table :deep(.t-table td) {
  padding: 0.75rem 0.625rem;
  vertical-align: middle;
}

.printer-manage-table :deep(.t-table th) {
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.printer-manage-table :deep(.t-table td) {
  height: 4.25rem;
}

.printer-manage-table :deep(.t-table__content) {
  min-width: 951px;
}

.printer-manage-table :deep(.t-table__body tr:hover td) {
  background: #f8fafc;
}

.printer-manage-card__status-panel {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.5rem;
  margin: -0.5rem -0.5rem 0.75rem;
  padding: 0 0.75rem;
  border-bottom: 1px solid #edf0f3;
}

.printer-status-tabs {
  display: flex;
  align-items: stretch;
  gap: 1.5rem;
  min-width: 0;
  height: 3.5rem;
}

.printer-status-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.1rem;
  border: 0;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-size: 0.875rem;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.printer-status-tab:hover,
.printer-status-tab--active {
  color: #2563eb;
}

.printer-status-tab--active {
  font-weight: 600;
}

.printer-status-tab--active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: #2563eb;
  content: '';
}

.printer-status-tab__count {
  min-width: 1.25rem;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
}

.printer-status-tab--active .printer-status-tab__count {
  background: #dbeafe;
  color: #1d4ed8;
}

.printer-status-tab__dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 999px;
  background: #f59e0b;
}

.printer-manage-card__hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #9ca3af;
  font-size: 0.75rem;
  white-space: nowrap;
}

.printer-filter-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 0 0 auto;
  margin-bottom: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  background: #f8fafc;
}

.printer-filter-toolbar__search {
  width: min(100%, 20rem);
}

.printer-filter-toolbar__tip {
  margin-right: auto;
  color: #9ca3af;
  font-size: 0.75rem;
}

.printer-table-primary {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  line-height: 1.25;
}

.printer-table-primary--center {
  align-items: center;
}

.printer-table-secondary {
  overflow: hidden;
  color: #6b7280;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.printer-table-secondary--muted {
  color: #9ca3af;
  font-family: inherit;
}

.printer-table-inline-status {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #6b7280;
  font-size: 0.75rem;
}

.printer-action-group {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  max-width: 100%;
  white-space: nowrap;
}

.printer-action-group :deep(.t-button) {
  flex: 0 0 auto;
}

@media (max-width: 1100px) {
  .printer-status-tabs {
    gap: 0.75rem;
  }

  .printer-manage-card__status-panel {
    align-items: flex-start;
    flex-direction: column;
    gap: 0;
    padding-top: 0.25rem;
  }

  .printer-manage-card__hint {
    display: none;
  }

  .printer-filter-toolbar__tip {
    display: none;
  }
}
</style>
