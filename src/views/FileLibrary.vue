<template>
  <div class="file-library">
    <!-- 顶部操作区 -->
    <el-card class="mb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-bold">📁 文件库</h1>
          <el-input v-model="searchKeyword" placeholder="搜索文件名..." clearable class="w-48" @keyup.enter="handleSearch">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
        </div>
        <div class="flex items-center gap-2">
          <el-button v-if="selectedIds.length > 0" type="danger" :icon="Delete" @click="handleBatchDelete">
            批量删除 ({{ selectedIds.length }})
          </el-button>
          <el-button :icon="Refresh" :loading="loading" @click="fetchData">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 上传区域 -->
    <el-card class="mb-4">
      <el-upload drag :auto-upload="false" :show-file-list="false" accept=".gcode,.bgcode" @change="handleFileChange"
        class="upload-area">
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          拖拽 G-Code 文件到此处 或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 .gcode 和 .bgcode 格式文件
          </div>
        </template>
      </el-upload>
    </el-card>

    <!-- 数据展示区 - 卡片网格 -->
    <div v-if="fileList.length > 0" class="mb-4">
      <el-row :gutter="16">
        <el-col v-for="file in fileList" :key="file.id" :xs="24" :sm="12" :md="8" :lg="6" class="mb-4">
          <el-card class="file-card" :class="{ 'is-selected': selectedIds.includes(file.id) }" shadow="hover">
            <!-- 卡片头部 - 复选框 -->
            <div class="card-header">
              <el-checkbox :model-value="selectedIds.includes(file.id)" @change="() => toggleSelection(file.id)"
                size="large" />
            </div>

            <!-- 图片区 -->
            <div class="image-wrapper">
              <el-image v-if="file.thumbnailUrl" :src="file.thumbnailUrl" :alt="file.originalName" fit="cover"
                class="thumbnail-image">
                <template #error>
                  <div class="image-placeholder">
                    <el-icon>
                      <Picture />
                    </el-icon>
                    <span>加载失败</span>
                  </div>
                </template>
              </el-image>
              <div v-else class="image-placeholder">
                <el-icon>
                  <Document />
                </el-icon>
                <span>NO IMAGE</span>
              </div>
              <!-- 材料类型标签 -->
              <el-tag type="primary" class="material-tag" effect="dark">
                {{ file.materialType || 'PLA' }}
              </el-tag>
            </div>

            <!-- 核心信息区 -->
            <div class="card-content">
              <h3 class="file-name" :title="file.originalName">
                {{ file.originalName }}
              </h3>

              <!-- 农场业务数据 -->
              <div class="business-data">
                <div class="data-item">
                  <el-icon>
                    <ScaleToOriginal />
                  </el-icon>
                  <span>{{ file.filamentWeight || 0 }}g</span>
                </div>
                <div class="data-item">
                  <el-icon>
                    <FullScreen />
                  </el-icon>
                  <span>{{ file.filamentLength || 0 }}m</span>
                </div>
                <div class="data-item">
                  <el-icon>
                    <Clock />
                  </el-icon>
                  <span>{{ formatTime(file.estTime) }}</span>
                </div>
              </div>

              <!-- 打印状态预警 -->
              <div class="stats-box" :class="getStatsClass(file.successRate)">
                <div class="stats-item">
                  <div class="stats-label">打印次数</div>
                  <div class="stats-value">{{ file.printCount || 0 }}</div>
                </div>
                <el-divider direction="vertical" />
                <div class="stats-item">
                  <div class="stats-label">成功率</div>
                  <div class="stats-value">{{ file.successRate || 0 }}%</div>
                </div>
              </div>
            </div>

            <!-- 操作区 -->
            <div class="card-actions">
              <el-button type="primary" :icon="Download" @click="handleDownload(file)">
                下载
              </el-button>
              <el-button type="danger" :icon="Delete" @click="handleDelete(file.id)">
                删除
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 空状态 -->
    <el-empty v-else-if="!loading" description="暂无文件，请上传 G-Code 文件" :image-size="200">
      <template #image>
        <el-icon :size="80" class="text-gray-400">
          <FolderOpened />
        </el-icon>
      </template>
    </el-empty>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading" style="font-size: 48px; color: var(--ep-color-primary);">
        <Refresh />
      </el-icon>
    </div>

    <!-- 分页区 -->
    <div v-if="fileList.length > 0" class="pagination-wrapper">
      <el-pagination v-model:current-page="pagination.pageNum" v-model:page-size="pagination.pageSize"
        :total="pagination.total" :page-sizes="[12, 24, 36, 48]" layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange" @current-change="handlePageChange" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Delete,
  Download,
  UploadFilled,
  Picture,
  Document,
  ScaleToOriginal,
  FullScreen,
  Clock,
  FolderOpened
} from '@element-plus/icons-vue'
import {
  getFileList,
  uploadFile as uploadPrintFile,
  deleteFile,
  deleteBatchFiles,
  downloadFile
} from '@/api/printFile'

defineOptions({ name: 'FileLibrary' })

// ============ 状态定义 ============
const loading = ref(false)
const fileList = ref([])
const selectedIds = ref([])
const searchKeyword = ref('')

// 分页状态
const pagination = reactive({
  pageNum: 1,
  pageSize: 12,
  total: 0
})

// ============ 方法定义 ============

/**
 * 获取文件列表
 */
const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      keyword: searchKeyword.value || undefined
    }
    const res = await getFileList(params)
    fileList.value = res.data?.records || []
    pagination.total = res.data?.total || 0

    // 清空选中状态（如果当前页数据变化）
    selectedIds.value = []
  } catch (error) {
    console.error('获取文件列表失败:', error)
    ElMessage.error('获取文件列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 搜索处理
 */
const handleSearch = () => {
  pagination.pageNum = 1
  fetchData()
}

/**
 * 分页大小变化
 */
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.pageNum = 1
  fetchData()
}

/**
 * 页码变化
 */
const handlePageChange = (page) => {
  pagination.pageNum = page
  fetchData()
}

/**
 * 切换选中状态
 */
const toggleSelection = (id) => {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

/**
 * 文件上传处理
 */
const handleFileChange = async (uploadFile) => {
  const file = uploadFile.raw
  if (!file) return

  // 验证文件类型
  if (!file.name.endsWith('.gcode') && !file.name.endsWith('.bgcode')) {
    ElMessage.warning('请上传 .gcode 或 .bgcode 文件')
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    await uploadPrintFile(formData)
    ElMessage.success('文件上传成功')
    fetchData()
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error('上传失败')
  }
}

/**
 * 删除单个文件
 */
const handleDelete = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个文件吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteFile(id)
    ElMessage.success('删除成功')

    // 从选中列表中移除
    const index = selectedIds.value.indexOf(id)
    if (index > -1) {
      selectedIds.value.splice(index, 1)
    }

    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 批量删除
 */
const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 个文件吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteBatchFiles(selectedIds.value)
    ElMessage.success('批量删除成功')
    selectedIds.value = []
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

/**
 * 下载文件
 */
const handleDownload = (file) => {
  downloadFile(file.id, file.originalName)
}

/**
 * 格式化时间
 */
const formatTime = (seconds) => {
  if (!seconds) return '未知'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) {
    return `${h}h ${m}m`
  }
  return `${m}m`
}

/**
 * 获取统计区域样式类
 * 成功率低于70%时添加警告样式
 */
const getStatsClass = (successRate) => {
  if (!successRate || successRate === 0) return ''
  if (successRate < 70) return 'warning-status'
  return ''
}

// ============ 生命周期 ============
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.file-library {
  padding: 16px;
}

/* 卡片选中状态 */
.file-card.is-selected {
  border-color: var(--ep-color-primary);
  box-shadow: 0 0 0 3px var(--ep-color-primary-light-3);
}

/* 卡片头部 - 复选框定位 */
.card-header {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
}

/* 图片区域 */
.image-wrapper {
  position: relative;
  height: 140px;
  margin-bottom: 12px;
  border-radius: var(--ep-border-radius-base);
  overflow: hidden;
  background-color: var(--ep-color-gray-2);
}

.thumbnail-image {
  width: 100%;
  height: 100%;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--ep-color-gray-6);
  gap: 6px;
}

.image-placeholder .el-icon {
  font-size: 36px;
}

/* 材料类型标签 */
.material-tag {
  position: absolute;
  top: 8px;
  right: 8px;
}

/* 卡片内容区 */
.card-content {
  padding: 0 4px;
}

.file-name {
  font-size: var(--ep-font-size-base);
  font-weight: var(--ep-font-weight-bold);
  color: var(--ep-text-color-primary);
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 农场业务数据 */
.business-data {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px;
  background-color: var(--ep-color-gray-1);
  border-radius: var(--ep-border-radius-base);
}

.data-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--ep-font-size-extra-small);
  color: var(--ep-text-color-regular);
}

.data-item .el-icon {
  color: var(--ep-color-primary);
  font-size: 14px;
}

/* 统计区域 */
.stats-box {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 10px;
  background-color: var(--ep-color-gray-1);
  border-radius: var(--ep-border-radius-base);
  margin-bottom: 12px;
}

.stats-box.warning-status {
  background-color: var(--ep-color-danger-light-5);
  border: 2px solid var(--ep-color-danger);
}

.stats-item {
  text-align: center;
  flex: 1;
}

.stats-label {
  font-size: 11px;
  color: var(--ep-text-color-secondary);
  margin-bottom: 3px;
}

.stats-value {
  font-size: var(--ep-font-size-base);
  font-weight: var(--ep-font-weight-bold);
  color: var(--ep-text-color-primary);
}

.warning-status .stats-value {
  color: var(--ep-color-danger);
}

/* 操作区 */
.card-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.card-actions .el-button {
  flex: 1;
  font-size: 12px;
  padding: 6px 12px;
}

/* 分页区 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 16px;
}

/* 上传区域样式优化 */
.upload-area :deep(.el-upload-dragger) {
  padding: 30px;
}

.upload-area :deep(.el-icon--upload) {
  font-size: 40px;
  color: var(--ep-color-primary);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .file-library {
    padding: 16px;
  }

  .business-data {
    flex-direction: column;
    gap: 8px;
  }

  .card-actions {
    flex-direction: column;
  }
}
</style>
