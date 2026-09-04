<template>
  <div class="h-full app-page-background flex flex-col overflow-hidden">
    <!-- 设备详情抽屉 -->
    <DeviceDetailDrawer
      v-model="detailDrawerVisible"
      :device="selectedDevice"
      :real-time-data="selectedDeviceRealTimeData"
      @closed="clearPrinterDetailContext"
    />

    <!-- 页面标题与操作栏 -->
    <div class="app-page-toolbar m-6 mb-4">
      <h1 class="app-page-toolbar__title app-route-title">打印机管理</h1>
      <div v-if="activeStatusFilter" class="app-page-toolbar__filter">
        <t-tag :theme="activeStatusFilter.theme" variant="light">
          当前筛选：{{ activeStatusFilter.label }}
        </t-tag>
        <t-button variant="text" size="small" @click="clearStatusFilter">显示全部</t-button>
      </div>
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

    <!-- 数据表格 -->
    <t-card class="shadow-sm rounded-xl hover:shadow-md transition-shadow duration-200 flex-1 flex flex-col overflow-hidden mx-6 mb-6">
      <TdTable
        :data="tableData"
        :loading="loading"
        style="width: 100%"
        class="rounded-lg overflow-hidden flex-1"
        :header-cell-style="{ background: '#f9fafb' }"
        @row-click="handleRowClick"
        row-class-name="cursor-pointer hover:bg-gray-50"
        height="calc(100vh - 320px)"
      >
        <TdTableColumn prop="id" label="ID" width="80" align="center">
          <template #default="scope">
            <span class="font-mono font-semibold text-gray-600">{{ scope.row.id }}</span>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="name" label="机器名称" min-width="150">
          <template #default="scope">
            <div class="flex items-center gap-2 font-medium">
              <printer :size="16" :stroke-color="getStatusColor(scope.row.status)" />
              <span>{{ scope.row.name }}</span>
            </div>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="machineNumber" label="机器编号" width="110" align="center">
          <template #default="scope">
            <span class="font-mono text-sm">{{ scope.row.machineNumber || `#${scope.row.id}` }}</span>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="ipAddress" label="IP 地址" width="160">
          <template #default="scope">
            <t-tag size="small" variant="light-outline" theme="default">{{ scope.row.ipAddress }}</t-tag>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="status" label="当前状态" width="120" align="center">
          <template #default="scope">
            <t-tag :theme="getStatusType(scope.row.status)" variant="light" size="small">
              {{ getStatusLabel(scope.row.status) }}
            </t-tag>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="firmwareType" label="协议" width="100" align="center">
          <template #default="scope">{{ scope.row.firmwareType || '-' }}</template>
        </TdTableColumn>

        <!-- 安全状态列 -->
        <TdTableColumn label="热床安全" width="120" align="center">
          <template #default="scope">
            <div class="flex items-center justify-center gap-1">
              <circle-check v-if="scope.row.isSafeToPrint" :size="14" stroke-color="#059669" />
              <circle-close v-else :size="14" stroke-color="#dc2626" />
              <t-tag :theme="scope.row.isSafeToPrint ? 'success' : 'danger'" variant="light" size="small">
                {{ scope.row.isSafeToPrint ? '已清理' : '待清理' }}
              </t-tag>
            </div>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="currentMaterial" label="装载耗材" width="120" align="center">
          <template #default="scope">
            <t-tag size="small" theme="warning" variant="light">
              {{ scope.row.currentMaterial || '-' }}
            </t-tag>
          </template>
        </TdTableColumn>

        <TdTableColumn prop="nozzleSize" label="喷嘴(mm)" width="100" align="center">
          <template #default="scope">
            <span class="font-medium text-gray-900">{{ scope.row.nozzleSize }}</span>
          </template>
        </TdTableColumn>

        <TdTableColumn label="当前任务" width="180" align="center">
          <template #default="scope">
            <div class="text-center">
              <span v-if="scope.row.currentJobId" class="text-sm">
                <span class="block truncate" :title="scope.row.currentJobFileName || `任务 #${scope.row.currentJobId}`">
                  {{ scope.row.currentJobFileName || `任务 #${scope.row.currentJobId}` }}
                </span>
                <span class="text-xs text-gray-500">任务 #{{ scope.row.currentJobId }}</span>
                <t-tag size="small" :theme="getJobStatusType(scope.row.currentJobStatus || scope.row.status)" class="ml-1">
                  {{ getJobStatusLabel(scope.row.currentJobStatus || scope.row.status) }}
                </t-tag>
              </span>
              <span v-else class="text-gray-400 text-sm">无</span>
            </div>
          </template>
        </TdTableColumn>

        <TdTableColumn label="操作" width="280" align="center" fixed="right">
          <template #default="scope">
            <div class="flex items-center justify-center gap-1">
              <!-- 确认热床已清理按钮 -->
              <t-button
                v-if="shouldShowSafeButton(scope.row)"
                size="small" theme="warning"
                @click="handleConfirmSafe(scope.row)"
                :loading="confirmingSafeIds.includes(scope.row.id)"
              >
                <span><check /></span>
                确认清理
              </t-button>
              <!-- 启动打印按钮 -->
              <t-button
                v-if="shouldShowStartButton(scope.row)"
                size="small" theme="success"
                @click="handleStartJob(scope.row)"
                :loading="startingJobIds.includes(scope.row.id)"
              >
                <span><printer /></span>
                启动打印
              </t-button>
              <!-- 编辑按钮 -->
              <t-button v-if="isAdmin" size="small" theme="primary" @click="handleEdit(scope.row)">
                <span><edit /></span>
                编辑
              </t-button>
              <!-- 删除按钮 -->
              <t-popconfirm v-if="isAdmin" content="确定要删除这台机器吗？"
                theme="danger"
                @confirm="handleDelete(scope.row.id)"
              >
                <template>
                  <t-button size="small" theme="danger" variant="outline">
                    <span><delete /></span>
                  </t-button>
                </template>
              </t-popconfirm>
            </div>
          </template>
        </TdTableColumn>
      </TdTable>

      <!-- 分页 -->
      <div class="flex justify-end mt-5">
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
  pageSize: 20
})

const statusFilterConfig = {
  PRINTING: { label: '打印中', theme: 'primary' },
  IDLE: { label: '空闲打印机', theme: 'success' },
  ATTENTION: { label: '异常设备', theme: 'danger' }
}

const activeStatusFilterKey = computed(() => {
  const value = Array.isArray(route.query.status) ? route.query.status[0] : route.query.status
  return statusFilterConfig[value] ? value : ''
})
const activeStatusFilter = computed(() => statusFilterConfig[activeStatusFilterKey.value] || null)

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

// 获取任务状态标签类型
const getJobStatusType = (status) => {
  const map = {
    'QUEUED': 'primary',
    'ASSIGNED': 'warning',
    'PRINTING': 'success',
    'PAUSED': 'warning',
    'COMPLETED': 'default',
    'FAILED': 'danger'
  }
  return map[status] || 'default'
}

const getJobStatusLabel = (status) => {
  const map = {
    QUEUED: '排队中',
    ASSIGNED: '已分配',
    PRINTING: '打印中',
    PAUSED: '已暂停',
    COMPLETED: '已完成',
    FAILED: '失败',
    CANCELLED: '已取消'
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
    restorePrinterDetailContext()
  } catch {
    // 错误在拦截器处理
  } finally {
    loading.value = false
  }
}

const clearStatusFilter = () => {
  const query = { ...route.query }
  delete query.status
  queryParams.pageNum = 1
  router.replace({ path: route.path, query })
}

watch(() => route.query.status, () => {
  queryParams.pageNum = 1
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
