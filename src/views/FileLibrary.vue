<template>
  <div class="min-h-screen p-6 bg-gray-50">
    <!-- 顶部操作栏 -->
    <div class="flex flex-wrap justify-between items-center gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm">
      <div class="flex flex-wrap items-center gap-4">
        <h1 class="text-xl font-bold text-gray-900 m-0">📁 文件库</h1>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索文件名..."
          clearable
          class="w-48"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="materialFilter"
          placeholder="材质筛选"
          clearable
          class="w-28"
          @change="handleSearch"
        >
          <el-option label="PLA" value="PLA" />
          <el-option label="ABS" value="ABS" />
          <el-option label="PETG" value="PETG" />
          <el-option label="TPU" value="TPU" />
          <el-option label="尼龙" value="尼龙" />
        </el-select>
        <el-select
          v-model="tagFilter"
          placeholder="标签筛选"
          clearable
          class="w-28"
          @change="handleSearch"
        >
          <el-option label="常用模型" value="常用模型" />
          <el-option label="测试件" value="测试件" />
          <el-option label="原型件" value="原型件" />
          <el-option label="量产件" value="量产件" />
        </el-select>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <el-button-group class="border border-gray-300 rounded overflow-hidden">
          <el-button
            :type="viewMode === 'grid' ? 'default' : 'default'"
            size="small"
            @click="viewMode = 'grid'"
            class="rounded-none border-0"
            :class="{ 'bg-gray-200': viewMode === 'grid' }"
          >
            <el-icon><Grid /></el-icon>
          </el-button>
          <el-button
            :type="viewMode === 'list' ? 'default' : 'default'"
            size="small"
            @click="viewMode = 'list'"
            class="rounded-none border-0"
            :class="{ 'bg-gray-200': viewMode === 'list' }"
          >
            <el-icon><List /></el-icon>
          </el-button>
        </el-button-group>
        <el-button
          type="primary"
          size="default"
          :icon="Upload"
          @click="handleUpload"
        >
          上传 G-Code 文件
        </el-button>
        <el-button
          v-if="selectedIds.length > 0"
          type="danger"
          size="default"
          :icon="Delete"
          @click="handleBatchDelete"
        >
          批量删除 ({{ selectedIds.length }})
        </el-button>
        <el-button
          :icon="Refresh"
          :loading="loading"
          @click="fetchData"
          size="default"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 文件列表区 -->
    <div v-if="fileList.length > 0" class="mb-6">
      <!-- 网格视图 -->
      <div v-if="viewMode === 'grid'" class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        <div
          v-for="file in fileList"
          :key="file.id"
          class="bg-white border border-gray-300 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer relative hover:shadow-md hover:-translate-y-0.5"
          :class="{ 'border-gray-600 shadow-[0_0_0_3px_rgba(107,114,128,0.5)]': selectedIds.includes(file.id) }"
          @click="toggleSelection(file.id)"
        >
          <!-- 卡片选中状态 -->
          <div class="absolute top-2 left-2 z-10">
            <el-checkbox
              :model-value="selectedIds.includes(file.id)"
              @click.stop="toggleSelection(file.id)"
              size="small"
            />
          </div>

          <!-- 缩略图区域 -->
          <div class="relative h-36 overflow-hidden bg-gray-100">
            <el-image
              v-if="file.thumbnailUrl"
              :src="file.thumbnailUrl"
              :alt="file.originalName"
              fit="cover"
              class="w-full h-full"
            >
              <template #error>
                <div class="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-1">
                  <el-icon size="36"><Picture /></el-icon>
                  <span class="text-sm">加载失败</span>
                </div>
              </template>
            </el-image>
            <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-1">
              <el-icon size="36"><Document /></el-icon>
              <span class="text-sm">NO IMAGE</span>
            </div>
            <!-- 材质标签 -->
            <el-tag
              :type="getMaterialTagType(file.materialType)"
              class="absolute top-2 right-2 z-5"
              size="small"
            >
              {{ file.materialType || 'PLA' }}
            </el-tag>
          </div>

          <!-- 卡片内容 -->
          <div class="p-3">
            <h3 class="text-sm font-semibold text-gray-900 mb-2 overflow-hidden text-ellipsis whitespace-nowrap" :title="file.originalName">
              {{ file.originalName }}
            </h3>

            <!-- 核心数据指标 -->
            <div class="flex gap-3 mb-3">
              <div class="flex items-center gap-1 text-xs text-gray-600">
                <el-icon size="14" class="text-gray-600"><Clock /></el-icon>
                <span>{{ formatTime(file.estTime) }}</span>
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-600">
                <el-icon size="14" class="text-gray-600"><ScaleToOriginal /></el-icon>
                <span>{{ file.filamentWeight || 0 }}g</span>
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-600">
                <el-icon size="14" class="text-gray-600"><FullScreen /></el-icon>
                <span>{{ file.filamentLength || 0 }}m</span>
              </div>
            </div>

            <!-- 统计信息 -->
            <div class="flex items-center justify-between p-2 bg-gray-100 rounded text-sm mb-3">
              <div class="flex flex-col gap-0.5">
                <span class="text-xs text-gray-600 uppercase">打印</span>
                <span class="text-sm font-semibold text-gray-900">{{ file.printCount || 0 }}次</span>
              </div>
              <div class="flex items-center gap-2 flex-1 ml-2">
                <span class="text-xs text-gray-600 w-8">成功率</span>
                <el-progress
                  :percentage="file.successRate || 0"
                  :stroke-width="4"
                  :show-text="false"
                  :class="getSuccessRateClass(file.successRate)"
                  class="flex-1"
                />
                <span class="text-sm font-semibold text-gray-900 w-10 text-right">{{ file.successRate || 0 }}%</span>
              </div>
            </div>

            <!-- 悬浮操作按钮 -->
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:opacity-100">
              <el-button
                type="primary"
                size="small"
                :icon="Printer"
                @click.stop="handlePrint(file)"
                class="flex-1 text-xs px-2 py-1"
              >
                打印
              </el-button>
              <el-button
                type="default"
                size="small"
                :icon="Edit"
                @click.stop="handleEdit(file)"
                class="flex-1 text-xs px-2 py-1"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                @click.stop="handleDelete(file.id)"
                class="flex-1 text-xs px-2 py-1"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-else class="bg-white rounded-lg shadow-sm overflow-hidden">
        <el-table
          :data="fileList"
          v-loading="loading"
          @selection-change="handleSelectionChange"
          border
          stripe
          style="width: 100%"
        >
          <el-table-column type="selection" width="50" align="center" />
          <el-table-column prop="originalName" label="文件名" min-width="200">
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                  <el-image
                    v-if="row.thumbnailUrl"
                    :src="row.thumbnailUrl"
                    fit="cover"
                    class="w-full h-full"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center text-gray-600">
                    <el-icon><Document /></el-icon>
                  </div>
                </div>
                <span class="text-sm font-medium text-gray-900 flex-1 overflow-hidden text-ellipsis whitespace-nowrap" :title="row.originalName">{{
                  row.originalName
                }}</span>
                <el-tag
                  :type="getMaterialTagType(row.materialType)"
                  size="small"
                  class="flex-shrink-0"
                >
                  {{ row.materialType || 'PLA' }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="estTime" label="预计耗时" width="85">
            <template #default="{ row }">{{ formatTime(row.estTime) }}</template>
          </el-table-column>
          <el-table-column prop="filamentWeight" label="耗材重量" width="85">
            <template #default="{ row }">{{
              row.filamentWeight || 0
            }}g</template>
          </el-table-column>
          <el-table-column prop="filamentLength" label="所需线长" width="85">
            <template #default="{ row }">{{
              row.filamentLength || 0
            }}m</template>
          </el-table-column>
          <el-table-column prop="printCount" label="打印次数" width="80" />
          <el-table-column prop="successRate" label="成功率" width="100">
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <el-progress
                  :percentage="row.successRate || 0"
                  :stroke-width="6"
                  :show-text="false"
                  :class="getSuccessRateClass(row.successRate)"
                  class="w-16"
                />
                <span class="text-sm">{{ row.successRate || 0 }}%</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center gap-1">
                <el-button
                  type="primary"
                  size="small"
                  :icon="Printer"
                  @click="handlePrint(row)"
                >
                  打印
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  @click="handleDelete(row.id)"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="flex justify-center py-16 px-4">
      <el-empty description="暂无文件，请上传 G-Code 文件">
        <template #image>
          <el-icon :size="80" class="text-gray-400">
            <FolderOpened />
          </el-icon>
        </template>
        <template #description>
          <div class="text-center">
            <p class="mb-4 text-gray-600">暂无文件，请上传 G-Code 文件</p>
            <el-button type="primary" :icon="Upload" @click="handleUpload">
              立即上传
            </el-button>
          </div>
        </template>
      </el-empty>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex flex-col items-center py-16 px-4 text-gray-600">
      <el-icon class="is-loading mb-3" size="48">
        <Refresh />
      </el-icon>
      <p>加载中...</p>
    </div>

    <!-- 分页 -->
    <div v-if="fileList.length > 0" class="flex justify-center pt-4">
      <el-pagination
        v-model:current-page="pagination.pageNum"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[12, 24, 36, 48]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
        class="bg-white p-4 rounded-lg shadow-sm"
      />
    </div>

    <!-- 文件上传对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传 G-Code 文件" width="500px">
      <el-upload
        drag
        action="#"
        :auto-upload="false"
        :show-file-list="false"
        accept=".gcode,.bgcode"
        @change="handleFileChange"
        class="p-4"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          拖拽 G-Code 文件到此处 或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 .gcode 和 .bgcode 格式文件，文件大小不超过 100MB
          </div>
        </template>
      </el-upload>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Delete,
  UploadFilled,
  Picture,
  Document,
  ScaleToOriginal,
  FullScreen,
  Clock,
  FolderOpened,
  Grid,
  List,
  Printer,
  Upload
} from '@element-plus/icons-vue'
import {
  getFileList,
  uploadFile as uploadPrintFile,
  deleteFile,
  deleteBatchFiles
} from '@/api/printFile'

defineOptions({ name: 'FileLibrary' })

// ============ 状态定义 ============
const loading = ref(false)
const fileList = ref([])
const selectedIds = ref([])
const searchKeyword = ref('')
const materialFilter = ref('')
const tagFilter = ref('')
const viewMode = ref('grid')
const uploadDialogVisible = ref(false)

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
      keyword: searchKeyword.value || undefined,
      materialType: materialFilter.value || undefined,
      tag: tagFilter.value || undefined
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
 * 列表视图选中处理
 */
const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map((item) => item.id)
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
    uploadDialogVisible.value = false
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
 * 发送打印
 */
const handlePrint = (file) => {
  ElMessage.info(`准备打印: ${file.originalName}`)
  // 这里可以添加发送到打印队列的逻辑
}

/**
 * 打开上传对话框
 */
const handleUpload = () => {
  uploadDialogVisible.value = true
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
 * 获取材质标签类型
 */
const getMaterialTagType = (materialType) => {
  const types = {
    PLA: 'success',
    ABS: 'warning',
    PETG: 'primary',
    TPU: 'info',
    尼龙: 'danger'
  }
  return types[materialType] || 'info'
}

/**
 * 获取成功率样式类
 */
const getSuccessRateClass = (successRate) => {
  if (!successRate || successRate === 0) return ''
  if (successRate < 70) return 'success-rate-warning'
  return 'success-rate-success'
}

// ============ 生命周期 ============
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
/* 进度条样式 */
.success-rate-success :deep(.el-progress__bar) {
  background-color: #059669;
}

.success-rate-warning :deep(.el-progress__bar) {
  background-color: #d97706;
}
</style>
