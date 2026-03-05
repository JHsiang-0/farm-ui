<template>
  <div class="printer-manage">
    <!-- 操作栏 -->
    <el-card class="operation-card" shadow="never">
      <div class="operation-bar">
        <div class="left">
          <el-button type="primary" plain @click="fetchData">
            <el-icon><refresh /></el-icon>
            刷新列表
          </el-button>
        </div>
        <div class="right">
          <el-button type="warning" @click="openScanDialog">
            <el-icon><aim /></el-icon>
            扫描局域网设备
          </el-button>
          <el-button type="success" @click="handleAdd">
            <el-icon><plus /></el-icon>
            新增打印机
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="hover">
      <el-table 
        :data="tableData" 
        v-loading="loading" 
        style="width: 100%" 
        class="custom-table"
        :header-cell-style="{ background: 'var(--ep-color-gray-1)' }"
      >
        <el-table-column prop="id" label="ID" width="80" align="center">
          <template #default="scope">
            <span class="printer-id">{{ scope.row.id }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="name" label="机器名称" min-width="150">
          <template #default="scope">
            <div class="printer-name-cell">
              <el-icon :size="16" :color="getStatusColor(scope.row.status)"><printer /></el-icon>
              <span>{{ scope.row.name }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="ipAddress" label="IP 地址" width="160">
          <template #default="scope">
            <el-tag size="small" effect="plain" type="info">{{ scope.row.ipAddress }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="当前状态" width="120" align="center">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" effect="light" size="small">
              {{ scope.row.status || '未知' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="currentMaterial" label="装载耗材" width="120" align="center">
          <template #default="scope">
            <el-tag size="small" type="warning" effect="light">
              {{ scope.row.currentMaterial || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="nozzleSize" label="喷嘴(mm)" width="100" align="center">
          <template #default="scope">
            <span class="nozzle-size">{{ scope.row.nozzleSize }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handleEdit(scope.row)">
              <el-icon><edit /></el-icon>
              编辑
            </el-button>
            <el-popconfirm 
              title="确定要删除这台机器吗？" 
              confirm-button-type="danger"
              @confirm="handleDelete(scope.row.id)"
            >
              <template #reference>
                <el-button size="small" type="danger" plain>
                  <el-icon><delete /></el-icon>
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="queryParams.pageNum"
          v-model:page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑打印机' : '新增打印机'" 
      width="520px"
      class="printer-dialog"
      destroy-on-close
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" class="printer-form">
        <el-form-item label="机器名称" prop="name">
          <el-input v-model="form.name" placeholder="例：Klipper-01">
            <template #prefix>
              <el-icon><printer /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="IP 地址" prop="ipAddress">
          <el-input v-model="form.ipAddress" placeholder="例：192.168.1.10">
            <template #prefix>
              <el-icon><link /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="当前耗材" prop="currentMaterial">
          <el-select v-model="form.currentMaterial" placeholder="请选择装载耗材" style="width: 100%">
            <el-option label="PLA" value="PLA" />
            <el-option label="PETG" value="PETG" />
            <el-option label="ABS" value="ABS" />
            <el-option label="TPU" value="TPU" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="喷嘴大小" prop="nozzleSize">
          <el-input-number 
            v-model="form.nozzleSize" 
            :precision="2" 
            :step="0.1" 
            :min="0.2" 
            :max="1.2"
            style="width: 150px"
          />
          <span class="form-unit">mm</span>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitLoading">
            <el-icon><check /></el-icon>
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 扫描局域网设备弹窗 -->
    <el-dialog 
      v-model="scanDialogVisible" 
      title="扫描局域网设备" 
      width="800px"
      class="scan-dialog"
      destroy-on-close
    >
      <!-- 扫描输入区 -->
      <div class="scan-input-section">
        <el-form label-width="90px" class="scan-form">
          <el-form-item label="网段前缀">
            <el-input 
              v-model="subnet" 
              placeholder="例：192.168.1" 
              size="default"
              :disabled="isScanning"
            >
              <template #append>
                <el-button 
                  type="primary" 
                  @click="handleScan" 
                  :loading="isScanning"
                >
                  <el-icon><search /></el-icon>
                  {{ isScanning ? '扫描中...' : '开始扫描' }}
                </el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </div>

      <!-- 加载状态 -->
      <div v-if="isScanning" class="scan-loading">
        <el-skeleton :rows="5" animated />
        <p class="loading-text">正在扫描局域网设备，请稍候...</p>
      </div>

      <!-- 扫描结果表格 -->
      <div v-else-if="scanResults.length > 0" class="scan-results-section">
        <!-- 统计文案 -->
        <div class="scan-stats">
          <el-alert
            :title="scanStatsText"
            type="info"
            :closable="false"
            show-icon
          />
        </div>

        <!-- 结果表格 -->
        <el-table
          ref="scanTableRef"
          :data="scanResults"
          style="width: 100%"
          class="scan-results-table"
          :header-cell-style="{ background: 'var(--ep-color-gray-1)' }"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" align="center" />
          
          <el-table-column label="状态" width="120" align="center">
            <template #default="scope">
              <el-tag 
                :type="scope.row.isNewDevice ? 'success' : 'primary'"
                effect="light"
                size="small"
              >
                {{ scope.row.isNewDevice ? '全新设备' : '已知设备' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="MAC 地址" width="140" align="center">
            <template #default="scope">
              <span class="mac-address">{{ scope.row.macAddress }}</span>
            </template>
          </el-table-column>

          <el-table-column label="IP 地址" width="130" align="center">
            <template #default="scope">
              <el-tag size="small" effect="plain" type="info">
                {{ scope.row.ipAddress }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="机器名称" min-width="150">
            <template #default="scope">
              <el-input
                v-model="scope.row.name"
                size="small"
                placeholder="请输入机器名称"
              >
                <template #prefix>
                  <el-icon><printer /></el-icon>
                </template>
              </el-input>
            </template>
          </el-table-column>

          <el-table-column label="建议名称" width="120" align="center">
            <template #default="scope">
              <span class="suggested-name">{{ scope.row.suggestedName }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <!-- 空状态 -->
      <el-empty 
        v-else-if="hasScanned && !isScanning" 
        description="该网段未发现设备"
        :image-size="80"
      >
        <template #description>
          <p>该网段未发现设备</p>
          <p class="empty-tip">请检查网段是否正确或设备是否在线</p>
        </template>
      </el-empty>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="scanDialogVisible = false">关闭</el-button>
          <el-button 
            type="success" 
            :disabled="selectedDevices.length === 0" 
            @click="handleBatchAdd"
            :loading="isBatchAdding"
          >
            <el-icon><folder-add /></el-icon>
            批量导入/同步 ({{ selectedDevices.length }})
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { 
  Refresh, 
  Aim, 
  Plus, 
  Printer, 
  Edit, 
  Delete, 
  Check,
  Search,
  FolderAdd
} from '@element-plus/icons-vue'
import { 
  getPrinterList, 
  addPrinter, 
  updatePrinter, 
  deletePrinter, 
  scanPrinters, 
  batchAddPrinters 
} from '@/api/printer'
import { ElMessage } from 'element-plus'

defineOptions({ name: 'PrinterManage' })

// ===== 列表与分页状态 =====
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const queryParams = reactive({
  pageNum: 1,
  pageSize: 20
})

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
    'PRINTING': 'var(--el-color-primary)',
    'IDLE': 'var(--el-color-success)',
    'ERROR': 'var(--el-color-danger)',
    'OFFLINE': 'var(--el-color-info)'
  }
  return map[status?.toUpperCase()] || 'var(--el-color-info)'
}

// 获取状态标签类型
const getStatusType = (status) => {
  if (!status) return 'info'
  const map = {
    'PRINTING': 'primary',
    'IDLE': 'success',
    'ERROR': 'danger',
    'OFFLINE': 'info'
  }
  return map[status.toUpperCase()] || 'info'
}

// 加载分页数据
const fetchData = async () => {
  loading.value = true
  try {
    const res = await getPrinterList(queryParams)
    tableData.value = res.data.records || []
    total.value = res.data.total || 0
  } catch {
    // 错误在拦截器处理
  } finally {
    loading.value = false
  }
}

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
      ElMessage.success('修改成功')
    } else {
      await addPrinter(payload)
      ElMessage.success('新增成功')
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
    ElMessage.success('删除成功')
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
    ElMessage.warning('请输入网段前缀')
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
    const message = res.message || res.data?.message || '批量处理完成'
    ElMessage.success(message)
    scanDialogVisible.value = false
    fetchData() // 刷新设备列表
  } catch (error) {
    // 拦截器会处理错误，但如果有特定错误信息可以在这里显示
    const errorMsg = error.response?.data?.message || '批量处理失败'
    ElMessage.error(errorMsg)
  } finally {
    isBatchAdding.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.printer-manage {
  display: flex;
  flex-direction: column;
  gap: var(--ep-space-5);
}

/* Operation Card */
.operation-card {
  border-radius: var(--ep-border-radius-medium);
  background-color: var(--ep-color-white);
}

.operation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left,
.right {
  display: flex;
  align-items: center;
  gap: var(--ep-space-3);
}

/* Table Card */
.table-card {
  border-radius: var(--ep-border-radius-large);
  box-shadow: var(--ep-box-shadow-base);
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.table-card:hover {
  box-shadow: var(--ep-box-shadow-medium);
}

.custom-table {
  border-radius: var(--ep-border-radius-medium);
  overflow: hidden;
}

.printer-id {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.printer-name-cell {
  display: flex;
  align-items: center;
  gap: var(--ep-space-2);
  font-weight: 500;
}

.nozzle-size {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

/* Pagination */
.pagination-container {
  margin-top: var(--ep-space-5);
  display: flex;
  justify-content: flex-end;
}

/* Dialog Styles */
.printer-dialog :deep(.el-dialog__header),
.scan-dialog :deep(.el-dialog__header) {
  padding: var(--ep-space-6);
  border-bottom: 1px solid var(--el-border-color-light);
}

.printer-dialog :deep(.el-dialog__body),
.scan-dialog :deep(.el-dialog__body) {
  padding: var(--ep-space-6);
}

.printer-dialog :deep(.el-dialog__footer),
.scan-dialog :deep(.el-dialog__footer) {
  padding: var(--ep-space-4) var(--ep-space-6);
  border-top: 1px solid var(--el-border-color-light);
}

.printer-form .form-unit {
  margin-left: var(--ep-space-3);
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-small);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--ep-space-3);
}

/* Scan Dialog Specific Styles */
.scan-input-section {
  margin-bottom: var(--ep-space-4);
}

.scan-loading {
  padding: var(--ep-space-6) 0;
  text-align: center;
}

.loading-text {
  margin-top: var(--ep-space-4);
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-small);
}

.scan-stats {
  margin-bottom: var(--ep-space-4);
}

.scan-results-section {
  background: var(--ep-color-white);
  border-radius: var(--ep-border-radius-medium);
}

/* MAC 地址等宽字体 */
.mac-address {
  font-family: 'Courier New', 'Monaco', monospace;
  font-size: var(--el-font-size-small);
  font-weight: 500;
  color: var(--el-text-color-regular);
  letter-spacing: 0.5px;
}

/* 建议名称 */
.suggested-name {
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-secondary);
}

/* 空状态提示 */
.empty-tip {
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-placeholder);
  margin-top: var(--ep-space-2);
}

/* 扫描结果表格优化 */
.scan-results-table :deep(.el-input__wrapper) {
  padding: 0 8px;
}

.scan-results-table :deep(.el-input__inner) {
  height: 28px;
  font-size: var(--el-font-size-small);
}

/* 旧样式兼容 - 可删除 */
.scan-intro {
  margin-bottom: var(--ep-space-5);
}

.scan-results {
  background-color: var(--ep-color-gray-1);
  border-radius: var(--ep-border-radius-medium);
  padding: var(--ep-space-4);
  margin-top: var(--ep-space-4);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--ep-space-3);
}

.results-header h4 {
  margin: 0;
  font-size: var(--el-font-size-base);
  color: var(--el-text-color-primary);
}

.results-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ep-space-2);
}

.result-tag {
  display: flex;
  align-items: center;
  gap: var(--ep-space-2);
}

/* Responsive */
@media (max-width: 768px) {
  .operation-bar {
    flex-direction: column;
    gap: var(--ep-space-3);
    align-items: stretch;
  }
  
  .left,
  .right {
    justify-content: center;
  }
}
</style>
