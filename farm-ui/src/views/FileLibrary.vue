<template>
  <div class="file-library">
    <!-- 上传区域 -->
    <el-card class="upload-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon :size="20" color="var(--el-color-primary)"><upload-filled /></el-icon>
            <span>上传 G-Code 切片文件</span>
          </div>
        </div>
      </template>
      
      <el-upload 
        class="upload-demo" 
        drag 
        action="#" 
        :http-request="customUpload" 
        :show-file-list="false"
        accept=".gcode"
      >
        <el-icon class="upload-icon" :size="48"><upload-filled /></el-icon>
        <div class="upload-text">
          将文件拖到此处，或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="upload-tip">
            <el-icon><info-filled /></el-icon>
            只能上传 .gcode 文件，系统将自动解析耗时与材料要求
          </div>
        </template>
      </el-upload>
    </el-card>

    <!-- 文件列表 -->
    <el-card class="list-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon :size="20" color="var(--el-color-primary)"><folder /></el-icon>
            <span>文件库</span>
          </div>
          <el-button type="primary" plain @click="fetchData" :loading="loading">
            <el-icon><refresh /></el-icon>
            刷新列表
          </el-button>
        </div>
      </template>

      <el-table 
        :data="tableData" 
        v-loading="loading" 
        style="width: 100%" 
        class="custom-table"
        :header-cell-style="{ background: 'var(--ep-color-gray-1)' }"
      >
        <el-table-column prop="id" label="ID" width="80" align="center" />
        
        <el-table-column prop="originalName" label="文件名" min-width="200" show-overflow-tooltip />

        <el-table-column label="文件大小" width="120" align="center">
          <template #default="scope">
            <el-tag size="small" effect="plain">{{ formatFileSize(scope.row.fileSize) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="预计耗时" width="120" align="center">
          <template #default="scope">
            <el-tag size="small" type="info" effect="plain">{{ formatTime(scope.row.estTime) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="materialType" label="指定耗材" width="100" align="center">
          <template #default="scope">
            <el-tag size="small" type="warning" effect="light">{{ scope.row.materialType || '-' }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="nozzleSize" label="喷嘴(mm)" width="100" align="center">
          <template #default="scope">
            <span class="nozzle-size">{{ scope.row.nozzleSize || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="scope">
            <el-button size="small" type="success" @click="openJobDialog(scope.row)">
              <el-icon><video-play /></el-icon>
              一键排产
            </el-button>
            <el-popconfirm 
              title="确定要删除这个文件吗？" 
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
      
      <el-empty v-if="tableData.length === 0 && !loading" description="暂无文件，请上传 G-Code 文件" />
    </el-card>

    <!-- 配置生产任务弹窗 -->
    <el-dialog 
      v-model="jobDialogVisible" 
      title="配置生产任务" 
      width="480px"
      class="task-dialog"
      destroy-on-close
    >
      <el-form :model="jobForm" label-width="100px" class="task-form">
        <el-form-item label="目标文件">
          <el-input :value="currentFile?.originalName" disabled>
            <template #prefix>
              <el-icon><document /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="要求耗材">
          <el-select v-model="jobForm.materialType" placeholder="选择耗材类型" style="width: 100%">
            <el-option label="PLA" value="PLA" />
            <el-option label="PETG" value="PETG" />
            <el-option label="ABS" value="ABS" />
            <el-option label="TPU" value="TPU" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="喷嘴尺寸">
          <el-input-number 
            v-model="jobForm.nozzleSize" 
            :precision="2" 
            :step="0.1" 
            :min="0.2" 
            :max="1.2"
            style="width: 150px"
          />
          <span class="form-unit">mm</span>
        </el-form-item>
        
        <el-form-item label="任务优先级">
          <el-slider v-model="jobForm.priority" :max="100" show-stops :step="10" />
        </el-form-item>

        <el-form-item label="分配模式">
          <el-radio-group v-model="jobForm.autoAssign">
            <el-radio :label="false">稍后手动派单</el-radio>
            <el-radio :label="true">全自动匹配</el-radio>
          </el-radio-group>
          <div class="form-tip" :class="{ 'is-auto': jobForm.autoAssign }">
            <el-icon><info-filled /></el-icon>
            {{ jobForm.autoAssign ? '系统会自动寻找匹配的空闲机器并开始打印' : '任务将进入调度大厅等待手动指派' }}
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="jobDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitJob" :loading="jobLoading">
            <el-icon><check /></el-icon>
            确认下发
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { 
  UploadFilled, 
  Folder, 
  Refresh, 
  VideoPlay, 
  Delete, 
  InfoFilled,
  Document,
  Check
} from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'
import { uploadPrintFile, getFileList, deletePrintFile, createPrintJob } from '@/api/file'

defineOptions({ name: 'FileLibrary' })

const loading = ref(false)
const tableData = ref([])

// 任务弹窗状态
const jobDialogVisible = ref(false)
const jobLoading = ref(false)
const currentFile = ref(null)

const jobForm = reactive({
  fileId: null,
  materialType: '',
  nozzleSize: 0.4,
  priority: 0,
  autoAssign: false
})

const openJobDialog = (file) => {
  currentFile.value = file
  jobForm.fileId = file.id
  jobForm.materialType = file.materialType || 'PLA'
  jobForm.nozzleSize = file.nozzleSize || 0.4
  jobForm.priority = 0
  jobForm.autoAssign = false
  jobDialogVisible.value = true
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getFileList({ pageNum: 1, pageSize: 50 })
    tableData.value = res.data.records || []
  } catch {
    // 忽略
  } finally {
    loading.value = false
  }
}

const customUpload = async (options) => {
  const loadingInstance = ElLoading.service({ 
    text: '文件上传解析中...', 
    background: 'rgba(255, 255, 255, 0.9)' 
  })
  try {
    const formData = new FormData()
    formData.append('file', options.file)

    await uploadPrintFile(formData)
    ElMessage.success('解析并入库成功！')
    fetchData()
  } catch (err) {
    options.onError(err)
  } finally {
    loadingInstance.close()
  }
}

const submitJob = async () => {
  jobLoading.value = true
  try {
    await createPrintJob(jobForm)
    ElMessage.success('新生产任务已下达队列！')
    jobDialogVisible.value = false
  } catch {
    // 拦截器处理
  } finally {
    jobLoading.value = false
  }
}

const handleDelete = async (id) => {
  try {
    await deletePrintFile(id)
    ElMessage.success('删除成功')
    fetchData()
  } catch {
    // 拦截器处理
  }
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTime = (seconds) => {
  if (!seconds) return '未知'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.file-library {
  display: flex;
  flex-direction: column;
  gap: var(--ep-space-6);
}

/* Card Styles */
.upload-card,
.list-card {
  border-radius: var(--ep-border-radius-large);
  box-shadow: var(--ep-box-shadow-base);
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.upload-card:hover,
.list-card:hover {
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

/* Upload Styles */
:deep(.el-upload-dragger) {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--ep-color-gray-1);
  border: 2px dashed var(--ep-color-gray-4);
  border-radius: var(--ep-border-radius-medium);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.el-upload-dragger:hover) {
  border-color: var(--el-color-primary);
  background-color: var(--ep-color-primary-light-6);
}

.upload-icon {
  color: var(--ep-color-gray-5);
  margin-bottom: var(--ep-space-4);
  transition: color 0.2s;
}

:deep(.el-upload-dragger:hover) .upload-icon {
  color: var(--el-color-primary);
}

.upload-text {
  font-size: var(--el-font-size-base);
  color: var(--el-text-color-regular);
}

.upload-text em {
  color: var(--el-color-primary);
  font-style: normal;
  font-weight: 500;
  cursor: pointer;
}

.upload-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ep-space-2);
  margin-top: var(--ep-space-4);
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-secondary);
}

/* Table Styles */
.custom-table {
  border-radius: var(--ep-border-radius-medium);
  overflow: hidden;
}

.nozzle-size {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

/* Dialog Styles */
.task-dialog :deep(.el-dialog__header) {
  padding: var(--ep-space-6);
  border-bottom: 1px solid var(--el-border-color-light);
}

.task-dialog :deep(.el-dialog__body) {
  padding: var(--ep-space-6);
}

.task-dialog :deep(.el-dialog__footer) {
  padding: var(--ep-space-4) var(--ep-space-6);
  border-top: 1px solid var(--el-border-color-light);
}

.task-form .form-unit {
  margin-left: var(--ep-space-3);
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-small);
}

.form-tip {
  display: flex;
  align-items: center;
  gap: var(--ep-space-2);
  margin-top: var(--ep-space-2);
  padding: var(--ep-space-3);
  background-color: var(--ep-color-gray-1);
  border-radius: var(--ep-border-radius-base);
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-secondary);
  transition: all 0.2s;
}

.form-tip.is-auto {
  background-color: var(--ep-color-primary-light-6);
  color: var(--ep-color-primary-dark-1);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--ep-space-3);
}

/* Responsive */
@media (max-width: 768px) {
  .file-library {
    gap: var(--ep-space-4);
  }
  
  .header-title {
    font-size: var(--el-font-size-base);
  }
}
</style>
