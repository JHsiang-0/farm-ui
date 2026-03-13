<template>
  <div class="h-full bg-gray-50 flex flex-col overflow-hidden">
    <!-- 顶部操作栏 -->
    <div class="flex flex-wrap justify-between items-center gap-4 m-6 mb-4 p-4 bg-white rounded-lg shadow-sm">
      <div class="flex flex-wrap items-center gap-4">
        <h1 class="text-xl font-bold text-gray-900 m-0">📁 文件库</h1>

        <!-- 面包屑导航 -->
        <el-breadcrumb separator="/" class="hidden sm:block">
          <el-breadcrumb-item :to="{ path: '' }" @click.prevent="navigateToRoot">
            <el-icon><folder-opened /></el-icon>
            <span>根目录</span>
          </el-breadcrumb-item>
          <el-breadcrumb-item
            v-for="(breadcrumb, index) in breadcrumbs"
            :key="breadcrumb.id"
            @click.prevent="navigateTo(index)"
          >
            {{ breadcrumb.name }}
          </el-breadcrumb-item>
        </el-breadcrumb>

        <el-input v-model="searchKeyword" placeholder="搜索文件名..." clearable class="w-40" size="default"
          @keyup.enter="handleSearch">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-select v-model="materialFilter" placeholder="材质筛选" clearable class="w-40" size="default"
          @change="handleSearch">
          <el-option label="PLA" value="PLA" />
          <el-option label="ABS" value="ABS" />
          <el-option label="PETG" value="PETG" />
          <el-option label="TPU" value="TPU" />
          <el-option label="尼龙" value="尼龙" />
        </el-select>
        <el-select v-model="tagFilter" placeholder="标签筛选" clearable class="w-40" size="default" @change="handleSearch">
          <el-option label="常用模型" value="常用模型" />
          <el-option label="测试件" value="测试件" />
          <el-option label="原型件" value="原型件" />
          <el-option label="量产件" value="量产件" />
        </el-select>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <el-button-group class="border border-gray-300 rounded overflow-hidden">
          <el-button :type="viewMode === 'grid' ? 'default' : 'default'" size="small" @click="viewMode = 'grid'"
            class="rounded-none border-0" :class="{ 'bg-gray-200': viewMode === 'grid' }">
            <el-icon>
              <Grid />
            </el-icon>
          </el-button>
          <el-button :type="viewMode === 'list' ? 'default' : 'default'" size="small" @click="viewMode = 'list'"
            class="rounded-none border-0" :class="{ 'bg-gray-200': viewMode === 'list' }">
            <el-icon>
              <List />
            </el-icon>
          </el-button>
        </el-button-group>
        <el-switch v-model="isBatchMode" active-text="批量操作" inactive-text="详情查看" />
        <el-button type="success" size="default" :icon="FolderOpened" @click="openCreateFolderDialog">
          新建文件夹
        </el-button>
        <el-button type="primary" size="default" :icon="Upload" @click="handleUpload">
          上传 G-Code 文件
        </el-button>
        <el-button v-if="isBatchMode && selectedIds.length > 0" type="danger" size="default" :icon="Delete" @click="handleBatchDelete">
          批量删除 ({{ selectedIds.length }})
        </el-button>
        <el-button :icon="Refresh" :loading="loading" @click="fetchData" size="default">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 文件列表区 -->
    <div v-if="fileList.length > 0" class="flex-1 overflow-hidden flex flex-col mx-6">
      <!-- 网格视图 -->
      <div v-if="viewMode === 'grid'" class="file-grid-view flex-1 overflow-y-auto pb-4">
        <!-- 文件夹 -->
        <div
          v-for="file in folderList"
          :key="file.id"
          class="file-card group bg-white border border-gray-300 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer relative hover:shadow-md"
          :class="isBatchMode && selectedIds.includes(file.id) ? 'border-primary shadow-lg' : ''"
          @dblclick="navigateToFolder(file)"
          @click="handleFileClick(file)"
        >
          <!-- 卡片选中状态 -->
          <div v-if="isBatchMode" class="absolute top-2 left-2 z-10">
            <el-checkbox :model-value="selectedIds.includes(file.id)" @click.stop="toggleSelection(file.id)"
              size="small" />
          </div>

          <!-- 文件夹图标 -->
          <div class="relative h-24 overflow-hidden bg-blue-50 flex items-center justify-center">
            <el-icon size="64" class="text-blue-500">
              <IconFolder />
            </el-icon>
          </div>

          <!-- 卡片内容 -->
          <div class="p-2">
            <h3 class="text-sm font-semibold text-gray-900 mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap"
              :title="file.originalName">
              {{ file.originalName }}
            </h3>

            <!-- 文件夹统计 -->
            <div class="flex items-center justify-between p-2 bg-gray-100 rounded text-sm mb-3">
              <div class="flex flex-col gap-0.5">
                <span class="text-xs text-gray-600 uppercase">类型</span>
                <span class="text-sm font-semibold text-gray-900">文件夹</span>
              </div>
            </div>

            <!-- 悬浮操作按钮 -->
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:opacity-100">
              <el-button type="primary" size="small" :icon="FolderOpened" @click.stop="navigateToFolder(file)"
                class="flex-1 text-xs px-1 py-1">
                打开
              </el-button>
              <el-button type="danger" size="small" :icon="Delete" @click.stop="handleDelete(file.id)"
                class="flex-1 text-xs px-1 py-1">
                删除
              </el-button>
            </div>
          </div>
        </div>

        <!-- 文件 -->
        <div
          v-for="file in fileItemsList"
          :key="file.id"
          class="file-card group bg-white border border-gray-300 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer relative hover:shadow-md"
          :class="isBatchMode && selectedIds.includes(file.id) ? 'border-primary shadow-lg' : ''"
          @click="handleFileClick(file)">
          <!-- 卡片选中状态 -->
          <div v-if="isBatchMode" class="absolute top-2 left-2 z-10">
            <el-checkbox :model-value="selectedIds.includes(file.id)" @click.stop="toggleSelection(file.id)"
              size="small" />
          </div>

          <!-- 缩略图区域 -->
          <div class="relative h-24 overflow-hidden bg-gray-100">
            <el-image v-if="file.thumbnailUrl" :src="file.thumbnailUrl" :alt="file.originalName" fit="cover"
              class="w-full h-full">
              <template #error>
                <div class="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-1">
                  <el-icon size="36">
                    <Picture />
                  </el-icon>
                  <span class="text-sm">加载失败</span>
                </div>
              </template>
            </el-image>
            <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-1">
              <el-icon size="36">
                <Document />
              </el-icon>
              <span class="text-sm">NO IMAGE</span>
            </div>
            <!-- 材质标签 -->
            <el-tag :type="getMaterialTagType(file.materialType)" class="absolute top-2 right-2 z-5" size="small">
              {{ file.materialType || 'PLA' }}
            </el-tag>
          </div>

          <!-- 卡片内容 -->
          <div class="p-2">
            <h3 class="text-sm font-semibold text-gray-900 mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap"
              :title="file.originalName">
              {{ file.originalName }}
            </h3>

            <!-- 核心数据指标 -->
            <div class="flex gap-2 mb-2">
              <div class="flex items-center gap-1 text-xs text-gray-600">
                <el-icon size="14" class="text-gray-600">
                  <Clock />
                </el-icon>
                <span>{{ formatTime(file.estTime) }}</span>
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-600">
                <el-icon size="14" class="text-gray-600">
                  <ScaleToOriginal />
                </el-icon>
                <span>{{ file.filamentWeight || 0 }}g</span>
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-600">
                <el-icon size="14" class="text-gray-600">
                  <FullScreen />
                </el-icon>
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
                <el-progress :percentage="file.successRate || 0" :stroke-width="4" :show-text="false"
                  :class="getSuccessRateClass(file.successRate)" class="flex-1" />
                <span class="text-sm font-semibold text-gray-900 w-10 text-right">{{ file.successRate || 0 }}%</span>
              </div>
            </div>

            <!-- 悬浮操作按钮 -->
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:opacity-100">
              <el-button type="primary" size="small" :icon="Printer" @click.stop="handlePrint(file)"
                class="flex-1 text-xs px-1 py-1">
                打印
              </el-button>
              <el-button type="danger" size="small" :icon="Delete" @click.stop="handleDelete(file.id)"
                class="flex-1 text-xs px-1 py-1">
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-else class="bg-white rounded-lg shadow-sm overflow-hidden flex-1">
        <el-table :data="fileList" v-loading="loading" @selection-change="handleSelectionChange"
          @row-click="handleTableRowClick" border stripe style="width: 100%" height="calc(100vh - 300px)">
          <el-table-column type="selection" width="50" align="center" />

          <el-table-column prop="originalName" label="文件名" min-width="200">
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                  <el-icon v-if="row.isFolder === 1" class="text-blue-500">
                    <IconFolder />
                  </el-icon>
                  <el-image v-else-if="row.thumbnailUrl" :src="row.thumbnailUrl" fit="cover" class="w-full h-full" />
                  <el-icon v-else class="text-gray-600">
                    <Document />
                  </el-icon>
                </div>
                <span class="text-sm font-medium text-gray-900 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                  :title="row.originalName">{{
                    row.originalName
                  }}</span>
                <el-tag v-if="row.isFolder === 1" size="small" class="flex-shrink-0">
                  文件夹
                </el-tag>
                <el-tag v-else :type="getMaterialTagType(row.materialType)" size="small" class="flex-shrink-0">
                  {{ row.materialType || 'PLA' }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="estTime" label="预计耗时" width="85" v-if="currentParentId">
            <template #default="{ row }">{{ row.isFolder === 1 ? '文件夹' : formatTime(row.estTime) }}</template>
          </el-table-column>

          <el-table-column prop="filamentWeight" label="耗材重量" width="85" v-if="currentParentId">
            <template #default="{ row }">{{
              row.isFolder === 1 ? '-' : (row.filamentWeight || 0) + 'g'
              }}</template>
          </el-table-column>

          <el-table-column prop="filamentLength" label="所需线长" width="85" v-if="currentParentId">
            <template #default="{ row }">{{
              row.isFolder === 1 ? '-' : (row.filamentLength || 0) + 'm'
              }}</template>
          </el-table-column>

          <el-table-column prop="printCount" label="打印次数" width="80" v-if="currentParentId" />

          <el-table-column prop="successRate" label="成功率" width="100" v-if="currentParentId">
            <template #default="{ row }">
              <div class="flex items-center gap-2" v-if="row.isFolder !== 1">
                <el-progress :percentage="row.successRate || 0" :stroke-width="6" :show-text="false"
                  :class="getSuccessRateClass(row.successRate)" class="w-16" />
                <span class="text-sm">{{ row.successRate || 0 }}%</span>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center gap-1">
                <el-button v-if="row.isFolder === 1" type="primary" size="small" :icon="FolderOpened" @click="navigateToFolder(row)">
                  打开
                </el-button>
                <el-button v-else type="primary" size="small" :icon="Printer" @click="handlePrint(row)">
                  打印
                </el-button>
                <el-button type="danger" size="small" :icon="Delete" @click="handleDelete(row.id)">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="flex justify-center py-16 px-4 mx-6">
      <el-empty description="暂无文件，请上传 G-Code 文件">
        <template #image>
          <el-icon :size="80" class="text-gray-400">
            <FolderOpened />
          </el-icon>
        </template>
        <template #description>
          <div class="text-center">
            <p class="text-gray-600">暂无文件，请上传 G-Code 文件</p>
          </div>
        </template>
      </el-empty>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex flex-col items-center py-16 px-4 mx-6 text-gray-600">
      <el-icon class="is-loading mb-3" size="48">
        <Refresh />
      </el-icon>
      <p>加载中...</p>
    </div>

    <!-- 分页 -->
    <div v-if="fileList.length > 0" class="flex justify-center pt-2 pb-6 shrink-0 mx-6">
      <el-pagination v-model:current-page="pagination.pageNum" v-model:page-size="pagination.pageSize"
        :total="pagination.total" background layout="total, prev, pager, next"
        @current-change="handlePageChange" class="bg-white p-4 rounded-lg shadow-sm" />
    </div>

    <!-- 文件上传对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传 G-Code 文件" width="500px">
      <el-upload drag action="#" :auto-upload="false" :show-file-list="false" accept=".gcode,.bgcode"
        @change="handleFileChange" class="p-4">
        <el-icon class="el-icon--upload">
          <UploadFilled />
        </el-icon>
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

    <!-- 新建文件夹对话框 -->
    <el-dialog v-model="createFolderDialogVisible" title="新建文件夹" width="400px">
      <el-form :model="folderForm" :rules="folderRules" ref="folderFormRef" label-width="80px">
        <el-form-item label="文件夹名称" prop="name">
          <el-input v-model="folderForm.name" placeholder="请输入文件夹名称" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <el-button @click="createFolderDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleCreateFolder" :loading="creatingFolder">
            创建
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 文件详情抽屉 -->
    <FileDetailDrawer
      v-model="detailDrawerVisible"
      :file="selectedFile"
      @download="handleFileDownload"
      @closed="closeFileDetail"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
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
  deleteBatchFiles,
  downloadFile,
  createFolder
} from '@/api/printFile'
import FileDetailDrawer from '@/components/file/FileDetailDrawer.vue'
import IconFolder from '@/components/icons/IconFolder.vue'

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
const createFolderDialogVisible = ref(false)
const creatingFolder = ref(false)

// 文件详情抽屉状态
const detailDrawerVisible = ref(false)
const selectedFile = ref(null)
// 批量操作模式
const isBatchMode = ref(false)

// 文件夹导航状态
const currentParentId = ref(null)
const breadcrumbs = ref([])

// 新建文件夹表单
const folderForm = reactive({
  name: ''
})

const folderRules = {
  name: [
    { required: true, message: '请输入文件夹名称', trigger: 'blur' },
    { min: 1, max: 50, message: '文件夹名称长度在 1 到 50 个字符之间', trigger: 'blur' }
  ]
}

const folderFormRef = ref(null)

// 分页状态
const pagination = reactive({
  pageNum: 1,
  pageSize: 12,
  total: 0
})

// 计算文件夹和文件列表
const folderList = computed(() => {
  return fileList.value.filter(file => file.isFolder === 1)
})

const fileItemsList = computed(() => {
  return fileList.value.filter(file => file.isFolder !== 1)
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
      tag: tagFilter.value || undefined,
      parentId: currentParentId.value
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
 * 导航到根目录
 */
const navigateToRoot = () => {
  currentParentId.value = null
  breadcrumbs.value = []
  pagination.pageNum = 1
  fetchData()
}

/**
 * 导航到指定文件夹
 */
const navigateToFolder = (folder) => {
  currentParentId.value = folder.id
  breadcrumbs.value.push({
    id: folder.id,
    name: folder.originalName
  })
  pagination.pageNum = 1
  fetchData()
}

/**
 * 导航到面包屑指定位置
 */
const navigateTo = (index) => {
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1)
  currentParentId.value = breadcrumbs.value[index]?.id || null
  pagination.pageNum = 1
  fetchData()
}

/**
 * 打开新建文件夹对话框
 */
const openCreateFolderDialog = () => {
  folderForm.name = ''
  createFolderDialogVisible.value = true
}

/**
 * 创建文件夹
 */
const handleCreateFolder = async () => {
  await folderFormRef.value?.validate()
  creatingFolder.value = true

  try {
    await createFolder({
      parentId: currentParentId.value,
      folderName: folderForm.name
    })
    ElMessage.success('文件夹创建成功')
    createFolderDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('创建文件夹失败:', error)
    ElMessage.error('创建文件夹失败')
  } finally {
    creatingFolder.value = false
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
    await ElMessageBox.confirm('确定要删除吗？', '提示', {
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
      `确定要删除选中的 ${selectedIds.value.length} 个项目吗？`,
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

/**
 * 打开文件详情
 */
const openFileDetail = (file, event) => {
  if (event) event.stopPropagation()
  // 将 camelCase 转换为 snake_case 以适配详情组件
  selectedFile.value = {
    id: file.id,
    original_name: file.originalName,
    safe_name: file.safeName || file.originalName,
    file_url: file.fileUrl,
    file_size: file.fileSize,
    user_id: file.userId,
    created_at: file.createdAt,
    thumbnail_url: file.thumbnailUrl,
    est_time: file.estTime,
    material_type: file.materialType,
    filament_weight: file.filamentWeight,
    filament_length: file.filamentLength,
    nozzle_size: file.nozzleSize,
    layer_height: file.layerHeight,
    first_layer_height: file.firstLayerHeight,
    bed_temp: file.bedTemp,
    nozzle_temp: file.nozzleTemp,
    first_layer_nozzle_temp: file.firstLayerNozzleTemp,
    first_layer_bed_temp: file.firstLayerBedTemp
  }
  detailDrawerVisible.value = true
}

/**
 * 关闭文件详情
 */
const closeFileDetail = () => {
  selectedFile.value = null
}

/**
 * 处理文件下载
 */
const handleFileDownload = async (file) => {
  if (!file?.id) {
    ElMessage.error('文件信息不完整')
    return
  }
  await downloadFile(file.id, file.original_name || file.originalName)
}

/**
 * 处理文件点击事件
 */
const handleFileClick = (file) => {
  if (isBatchMode.value) {
    // 批量操作模式：执行选择操作
    toggleSelection(file.id)
  } else {
    // 详情查看模式：如果是文件夹则打开，否则显示详情
    if (file.isFolder === 1) {
      navigateToFolder(file)
    } else {
      openFileDetail(file)
    }
  }
}

/**
 * 处理表格行点击事件
 */
const handleTableRowClick = (row) => {
  if (isBatchMode.value) {
    // 批量操作模式：表格有内置的选择功能，不额外处理
  } else {
    // 详情查看模式：如果是文件夹则打开，否则显示详情
    if (row.isFolder === 1) {
      navigateToFolder(row)
    } else {
      openFileDetail(row)
    }
  }
}

// ============ 生命周期 ============
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
/* 网格视图布局 */
.file-grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
  align-content: start;
  overflow-y: auto;
  padding-bottom: 1rem;
}

/* 文件卡片样式 */
.file-card {
  height: fit-content;
  min-height: auto;
  display: flex;
  flex-direction: column;
}

/* 进度条样式 */
.success-rate-success :deep(.el-progress__bar) {
  background-color: #059669;
}

.success-rate-warning :deep(.el-progress__bar) {
  background-color: #d97706;
}
</style>
