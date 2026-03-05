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
      width="560px"
      class="scan-dialog"
      destroy-on-close
    >
      <div class="scan-intro">
        <el-alert
          title="系统将自动扫描指定网段内的 Klipper 打印机"
          type="info"
          :closable="false"
          show-icon
        />
      </div>
      
      <el-form label-width="100px" class="scan-form">
        <el-form-item label="网段前缀">
          <el-input 
            v-model="subnet" 
            placeholder="例：192.168.1" 
            size="large"
          >
            <template #append>
              <el-button type="primary" @click="handleScan" :loading="isScanning">
                <el-icon><search /></el-icon>
                开始扫描
              </el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>

      <div v-if="scanResults.length > 0" class="scan-results">
        <div class="results-header">
          <h4>发现新设备 ({{ scanResults.length }}台)</h4>
          <el-tag type="success" effect="dark" size="small">待入库</el-tag>
        </div>
        <div class="results-list">
          <el-tag 
            v-for="ip in scanResults" 
            :key="ip" 
            type="success" 
            effect="plain"
            size="large"
            class="result-tag"
          >
            <el-icon><printer /></el-icon>
            {{ ip }}
          </el-tag>
        </div>
      </div>
      
      <el-empty 
        v-else-if="hasScanned" 
        description="该网段未发现新设备"
        :image-size="80"
      />

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="scanDialogVisible = false">关闭</el-button>
          <el-button 
            type="success" 
            :disabled="scanResults.length === 0" 
            @click="handleBatchAdd"
            :loading="isBatchAdding"
          >
            <el-icon><folder-add /></el-icon>
            一键批量入库
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
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
  hasScanned.value = false
  scanDialogVisible.value = true
}

const handleScan = async () => {
  if (!subnet.value) {
    ElMessage.warning('请输入网段前缀')
    return
  }
  isScanning.value = true
  hasScanned.value = false
  try {
    const res = await scanPrinters(subnet.value)
    scanResults.value = res.data || []
    hasScanned.value = true
  } catch {
    // 拦截器处理错误
  } finally {
    isScanning.value = false
  }
}

const handleBatchAdd = async () => {
  if (scanResults.value.length === 0) return
  isBatchAdding.value = true
  try {
    await batchAddPrinters(scanResults.value)
    ElMessage.success('批量入库成功！')
    scanDialogVisible.value = false
    fetchData()
  } catch {
    // 拦截器处理
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

/* Scan Dialog Specific */
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
