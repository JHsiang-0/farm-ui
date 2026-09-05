<template>
  <div class="app-page-shell app-page-background file-library-page">
    <div class="file-library-layout">
      <aside class="file-library-sidebar">
        <div class="file-library-sidebar__header">
          <div class="file-library-sidebar__title">
            <FolderOpened :size="16" />
            <span>文件夹列表</span>
          </div>
          <t-button variant="text" size="small" aria-label="新建文件夹" @click="openCreateFolderDialog">+</t-button>
        </div>

        <div class="file-library-sidebar__search">
          <t-input v-model="folderSearchKeyword" size="small" placeholder="搜索文件夹..." clearable>
            <template #prefixIcon><Search /></template>
          </t-input>
        </div>

        <nav class="file-library-folder-nav" aria-label="文件夹列表">
          <button
            type="button"
            class="file-library-folder-item"
            :class="{ 'file-library-folder-item--active': currentParentId === null }"
            @click="navigateToRoot"
          >
            <span class="file-library-folder-item__name">
              <FolderOpened :size="15" />
              <span>全部切片（根目录）</span>
            </span>
            <span v-if="currentParentId === null" class="file-library-folder-item__count">{{ pagination.total }}</span>
          </button>
          <button
            v-for="folder in filteredFolderList"
            :key="folder.id"
            type="button"
            class="file-library-folder-item"
            :class="{ 'file-library-folder-item--active': String(currentParentId) === String(folder.id) }"
            @click="navigateToFolder(folder)"
          >
            <span class="file-library-folder-item__name">
              <FolderOpened :size="15" />
              <span>{{ folder.originalName }}</span>
            </span>
            <span v-if="Number.isFinite(Number(folder.fileCount))" class="file-library-folder-item__count">
              {{ folder.fileCount }}
            </span>
          </button>
        </nav>

        <div class="file-library-storage">
          <div class="file-library-storage__label">
            <span>集群云存储空间</span>
            <span class="file-library-storage__value">24.8 GB <em>/ 128 GB</em></span>
          </div>
          <div class="file-library-storage__track">
            <span></span>
          </div>
        </div>
      </aside>

      <section class="file-library-main">
        <header class="file-library-header">
          <t-breadcrumb separator="/" class="file-library-header__breadcrumb">
            <t-breadcrumb-item @click.prevent="navigateToRoot">根目录</t-breadcrumb-item>
            <t-breadcrumb-item
              v-for="(breadcrumb, index) in breadcrumbs"
              :key="breadcrumb.id"
              @click.prevent="navigateTo(index)"
            >
              {{ breadcrumb.name }}
            </t-breadcrumb-item>
          </t-breadcrumb>

          <div class="file-library-header__actions">
            <div class="file-view-toggle" role="group" aria-label="视图切换">
              <t-button
                variant="text"
                size="small"
                :class="{ 'file-view-toggle__active': viewMode === 'list' }"
                aria-label="列表视图"
                @click="viewMode = 'list'"
              >
                <List />
              </t-button>
              <t-button
                variant="text"
                size="small"
                :class="{ 'file-view-toggle__active': viewMode === 'grid' }"
                aria-label="网格视图"
                @click="viewMode = 'grid'"
              >
                <Grid />
              </t-button>
            </div>
            <t-button variant="outline" theme="default" size="medium" :icon="renderIcon(FolderOpened)" @click="openCreateFolderDialog">
              新建文件夹
            </t-button>
            <t-button theme="primary" size="medium" :icon="renderIcon(Upload)" @click="handleUpload">
              上传 G-Code 文件
            </t-button>
            <t-button :icon="renderIcon(Refresh)" :loading="loading" size="medium" @click="fetchData">
              刷新
            </t-button>
          </div>
        </header>

        <section class="file-library-filters">
          <div class="file-library-filters__fields">
            <t-input
              v-model="searchKeyword"
              class="file-library-filters__search"
              placeholder="通过文件名检索文件（按 Enter 确认）..."
              clearable
              size="medium"
              @keyup.enter="handleSearch"
            >
              <template #prefixIcon><Search /></template>
            </t-input>
            <t-select v-model="modelFilter" class="file-library-filters__select" placeholder="按适配机型过滤" clearable size="medium" @change="handleSearch">
              <t-option label="A1" value="A1" />
              <t-option label="X1-Carbon" value="X1-Carbon" />
              <t-option label="P1S" value="P1S" />
            </t-select>
            <t-select v-model="nozzleFilter" class="file-library-filters__select" placeholder="喷嘴规格" clearable size="medium" @change="handleSearch">
              <t-option label="0.2mm 精细" value="0.2" />
              <t-option label="0.4mm 标准" value="0.4" />
              <t-option label="0.6mm 不锈钢" value="0.6" />
            </t-select>
            <t-select v-model="materialFilter" class="file-library-filters__select" placeholder="材质筛选" clearable size="medium" @change="handleSearch">
              <t-option label="PLA" value="PLA" />
              <t-option label="ABS" value="ABS" />
              <t-option label="PETG" value="PETG" />
              <t-option label="TPU" value="TPU" />
              <t-option label="尼龙" value="尼龙" />
            </t-select>
          </div>
          <t-checkbox v-model="showSliceDetails" class="file-library-filters__details">
            展示切片详情（耗材 / 机型 / 床温）
          </t-checkbox>
        </section>

        <div class="file-library-table-area">
          <div v-if="loading" class="file-library-state">
            <Refresh :size="40" class="is-loading" />
            <p>加载中...</p>
          </div>
          <div v-else-if="fileList.length === 0" class="file-library-state">
            <FolderOpened :size="64" />
            <p>暂无文件，请上传 G-Code 文件</p>
          </div>
          <div v-else-if="viewMode === 'list'" class="file-library-list-view">
            <TdTable
              class="file-library-table"
              :data="displayFileList"
              :loading="loading"
              border
              @selection-change="handleSelectionChange"
              @row-click="handleTableRowClick"
              style="width: 100%"
              height="100%"
            >
              <TdTableColumn type="selection" width="44" align="center" />
              <TdTableColumn prop="originalName" label="文件名称" min-width="245">
                <template #default="{ row }">
                  <div class="file-library-name-cell">
                    <div class="file-library-name-cell__icon" :class="row.folder ? 'file-library-name-cell__icon--folder' : ''">
                      <IconFolder v-if="row.folder" :size="20" />
                      <t-image v-else-if="row.thumbnailUrl" :src="row.thumbnailUrl" :alt="row.originalName" fit="cover" />
                      <Document v-else :size="19" />
                    </div>
                    <div class="file-library-name-cell__content">
                      <div class="file-library-name-cell__title" :title="row.originalName">
                        <span>{{ row.originalName }}</span>
                        <t-tag v-if="row.folder" size="small">文件夹</t-tag>
                        <t-tag v-else :theme="getMaterialTagType(row.materialType)" size="small">{{ getFileTypeLabel(row) }}</t-tag>
                      </div>
                      <div v-if="row.folder" class="file-library-name-cell__subtext">
                        {{ getFolderDescription(row) }}
                      </div>
                      <div v-else-if="showSliceDetails" class="file-library-name-cell__subtext">
                        {{ formatFileSize(row.fileSize) }} · {{ row.printCount || 0 }} 次打印
                      </div>
                    </div>
                  </div>
                </template>
              </TdTableColumn>
              <TdTableColumn label="适配机型 | 喷嘴 | 热床" min-width="190">
                <template #default="{ row }">
                  <div v-if="row.folder" class="file-library-muted">--</div>
                  <div v-else class="file-library-compatibility">
                    <strong>{{ getCompatibleModel(row) }}</strong>
                    <span v-if="showSliceDetails">{{ formatNozzle(row.nozzleSize) }} · {{ formatBedTemperature(row.bedTemp) }}</span>
                    <span v-else>{{ formatNozzle(row.nozzleSize) }}</span>
                  </div>
                </template>
              </TdTableColumn>
              <TdTableColumn prop="estTime" label="持续时间" width="105">
                <template #default="{ row }">{{ row.folder ? '--' : formatDuration(row.estTime) }}</template>
              </TdTableColumn>
              <TdTableColumn label="预估耗材 & 材质" width="160">
                <template #default="{ row }">
                  <div v-if="row.folder" class="file-library-muted">--</div>
                  <div v-else class="file-library-material">
                    <strong>{{ row.filamentWeight || 0 }}g</strong>
                    <t-tag :theme="getMaterialTagType(row.materialType)" size="small">{{ row.materialType || 'PLA' }}</t-tag>
                  </div>
                </template>
              </TdTableColumn>
              <TdTableColumn prop="createdAt" label="上传时间" width="145">
                <template #default="{ row }">{{ formatFileDate(row.createdAt) }}</template>
              </TdTableColumn>
              <TdTableColumn label="操作" width="150" fixed="right" align="center">
                <template #default="{ row }">
                  <div class="file-library-row-actions">
                    <t-button v-if="row.folder" variant="outline" theme="primary" size="small" :icon="renderIcon(FolderOpened)" @click.stop="navigateToFolder(row)">
                      打开
                    </t-button>
                    <t-button v-else variant="outline" theme="primary" size="small" :icon="renderIcon(Printer)" @click.stop="handlePrint(row)">
                      新建任务
                    </t-button>
                    <t-button variant="text" theme="danger" size="small" :icon="renderIcon(Delete)" aria-label="删除" @click.stop="handleDelete(row.id)" />
                  </div>
                </template>
              </TdTableColumn>
            </TdTable>
          </div>

          <div v-else class="file-grid-view">
            <div
              v-for="file in displayFileList"
              :key="file.id"
              class="file-card group"
              :class="selectedIds.includes(file.id) ? 'file-card--selected' : ''"
              @click="handleFileClick(file)"
            >
              <div v-if="selectedIds.length >= 0" class="file-card__select" @click.stop="toggleSelection(file.id)">
                <t-checkbox :checked="selectedIds.includes(file.id)" size="small" />
              </div>
              <div class="file-card__media" :class="file.folder ? 'file-card__media--folder' : ''">
                <IconFolder v-if="file.folder" :size="60" />
                <t-image v-else-if="file.thumbnailUrl" :src="file.thumbnailUrl" :alt="file.originalName" fit="cover" class="file-card__image" />
                <template v-else>
                  <Document :size="38" />
                  <span>NO IMAGE</span>
                </template>
                <t-tag v-if="!file.folder" :theme="getMaterialTagType(file.materialType)" size="small">{{ file.materialType || 'PLA' }}</t-tag>
              </div>
              <div class="file-card__body">
                <h3 :title="file.originalName">{{ file.originalName }}</h3>
                <div v-if="file.folder" class="file-card__folder-meta">类型：文件夹</div>
                <template v-else>
                  <div class="file-card__metrics">
                    <span><Clock :size="13" />{{ formatDuration(file.estTime) }}</span>
                    <span><ScaleToOriginal :size="13" />{{ file.filamentWeight || 0 }}g</span>
                    <span><FullScreen :size="13" />{{ file.filamentLength || 0 }}m</span>
                    <span>{{ formatFileSize(file.fileSize) }}</span>
                  </div>
                  <div class="file-card__stats">
                    <span>打印 {{ file.printCount || 0 }} 次</span>
                    <span>{{ file.successRate || 0 }}%</span>
                  </div>
                </template>
                <div class="file-card__actions">
                  <t-button v-if="file.folder" theme="primary" size="small" :icon="renderIcon(FolderOpened)" @click.stop="navigateToFolder(file)">打开</t-button>
                  <t-button v-else theme="primary" size="small" :icon="renderIcon(Printer)" @click.stop="handlePrint(file)">新建任务</t-button>
                  <t-button theme="danger" size="small" :icon="renderIcon(Delete)" @click.stop="handleDelete(file.id)">删除</t-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="file-library-footer">
          <div class="file-library-footer__batch">
            <t-button variant="outline" size="small" :disabled="selectedIds.length === 0" :icon="renderIcon(Delete)" @click="handleBatchDelete">
              批量删除
            </t-button>
            <span>{{ selectedIds.length }} 已选择</span>
          </div>
          <div class="file-library-footer__pagination">
            <span>共 {{ displayTotal }} 条切片数据</span>
            <t-pagination
              v-model:current="pagination.pageNum"
              v-model:pageSize="pagination.pageSize"
              :total="displayTotal"
              :page-size-options="[20, 50, 100]"
              @change="handlePageChange"
            />
          </div>
        </footer>
      </section>
    </div>

    <!-- 文件上传对话框 -->
    <t-dialog v-model:visible="uploadDialogVisible" header="上传 G-Code 文件" width="500px" :footer="false">
      <t-upload theme="custom" draggable :auto-upload="false" accept=".gcode,.g,.3mf,.stl"
        @change="handleFileChange" class="p-4">
        <span class="farm-icon--upload">
          <UploadFilled />
        </span>
        <div class="farm-upload__text">
          拖拽 G-Code 文件到此处 或 <em>点击上传</em>
        </div>
        <template #tips>
          <div class="farm-upload__tip">
            支持 .gcode、.bgcode、.g、.3mf、.stl 格式文件，文件大小不超过 200MB
          </div>
        </template>
      </t-upload>
      <div v-if="uploadingFile" class="px-4 pb-4">
        <div class="flex justify-between text-sm text-gray-600 mb-2">
          <span>正在上传：{{ uploadingFile.name }}</span>
          <span>{{ uploadProgress }}%</span>
        </div>
        <t-progress :percentage="uploadProgress" />
        <t-button class="mt-3" variant="outline" size="small" @click="cancelUpload">取消上传</t-button>
      </div>
      <div v-if="uploadError" class="px-4 pb-4">
        <t-alert theme="error" :title="uploadError" :closable="false" />
        <t-button class="mt-3" size="small" theme="primary" @click="retryUpload">重新上传</t-button>
      </div>
    </t-dialog>

    <!-- 新建文件夹对话框 -->
    <t-dialog v-model:visible="createFolderDialogVisible" header="新建文件夹" width="400px">
      <t-form :data="folderForm" :rules="folderRules" ref="folderFormRef" label-width="80px">
        <t-form-item label="文件夹名称" name="name">
          <t-input v-model="folderForm.name" placeholder="请输入文件夹名称" />
        </t-form-item>
      </t-form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <t-button @click="createFolderDialogVisible = false">取消</t-button>
          <t-button theme="primary" @click="handleCreateFolder" :loading="creatingFolder">
            创建
          </t-button>
        </div>
      </template>
    </t-dialog>

    <!-- 文件详情抽屉 -->
    <FileDetailDrawer
      v-model="detailDrawerVisible"
      :file="selectedFile"
      @download="handleFileDownload"
      @closed="closeFileDetail"
      @print="handlePrintFromDetail"
    />

    <!-- 创建打印任务对话框 -->
    <t-dialog v-model:visible="createJobDialogVisible" header="创建打印任务"
      width="480px"
      :close-on-overlay-click="false"
      :close-on-esc-keydown="true"
    >
      <div class="create-job-form">
        <!-- 文件信息展示 -->
        <div class="bg-gray-50 rounded-lg p-4 mb-5">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded border border-gray-200 overflow-hidden bg-white flex-shrink-0">
              <t-image
                v-if="jobForm.file?.thumbnailUrl"
                :src="jobForm.file?.thumbnailUrl"
                fit="cover"
                class="w-full h-full"
              >
                <template #error>
                  <div class="w-full h-full flex items-center justify-center text-gray-400">
                    <span><Document /></span>
                  </div>
                </template>
              </t-image>
              <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                <span><Document /></span>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-gray-500 mb-1">当前选中文件</div>
              <div class="text-base font-semibold text-gray-900 truncate" :title="jobForm.file?.originalName">
                {{ jobForm.file?.originalName }}
              </div>
            </div>
          </div>
        </div>

        <!-- 表单区域 -->
        <t-form :data="jobForm" label-width="90px" size="medium">
          <!-- 任务优先级 -->
          <t-form-item label="任务优先级">
            <t-radio-group v-model="jobForm.priority">
              <t-radio :value="0">
                <span class="text-gray-700">普通</span>
              </t-radio>
              <t-radio :value="1">
                <span class="text-yellow-600">优先</span>
              </t-radio>
              <t-radio :value="2">
                <span class="text-red-600">加急</span>
              </t-radio>
            </t-radio-group>
          </t-form-item>

          <t-form-item label="打印机">
            <t-select v-model="jobForm.printerId" placeholder="不指定，创建后进入队列" clearable :loading="loadingPrinters">
              <t-option label="不指定（进入队列）" value="" />
              <t-option
                v-for="printer in availablePrinters"
                :key="printer.id"
                :label="`${printer.name}（${printer.machineNumber || `#${printer.id}`}）`"
                :value="printer.id"
              />
            </t-select>
            <div class="text-xs text-gray-500 mt-1">指定打印机只记录分配目标，不会跳过安全确认流程</div>
          </t-form-item>

          <!-- 打印份数 -->
          <t-form-item label="打印份数">
            <t-input-number
              v-model="jobForm.copies"
              :min="1"
              :max="99"
              :step="1"

              class="w-full"
            />
            <div class="text-xs text-gray-500 mt-1">将为同一文件创建多个排队任务</div>
          </t-form-item>
        </t-form>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <t-button @click="createJobDialogVisible = false">取消</t-button>
          <t-button theme="primary" @click="handleSubmitCreateJob" :loading="submittingJob">
            确认提交
          </t-button>
        </div>
      </template>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { message, confirmMessage } from '@/utils/message'
import { renderIcon } from '@/utils/tdesign'
import {
  SearchIcon as Search,
  RefreshIcon as Refresh,
  DeleteIcon as Delete,
  CloudUploadIcon as UploadFilled,
  FileIcon as Document,
  ZoomInIcon as ScaleToOriginal,
  FullscreenIcon as FullScreen,
  TimeIcon as Clock,
  FolderOpenIcon as FolderOpened,
  GridViewIcon as Grid,
  ViewListIcon as List,
  PrintIcon as Printer,
  UploadIcon as Upload
} from 'tdesign-icons-vue-next'
import {
  getFileList,
  uploadFile as uploadPrintFile,
  deleteFile,
  deleteBatchFiles,
  downloadFile,
  createFolder,
  getFilePreview,
  getThumbnailUrl
} from '@/api/printFile'
import { createPrintJob } from '@/api/job'
import { getPrinterList } from '@/api/printer'
import { formatDuration, formatFileSize } from '@/utils/formatters'
import FileDetailDrawer from '@/components/file/FileDetailDrawer.vue'
import IconFolder from '@/components/icons/IconFolder.vue'
import TdTable from '@/components/TdTable.vue'
import TdTableColumn from '@/components/TdTableColumn.vue'

defineOptions({ name: 'FileLibrary' })

// ============ 状态定义 ============
const loading = ref(false)
const fileList = ref([])
const selectedIds = ref([])
const searchKeyword = ref('')
const folderSearchKeyword = ref('')
const modelFilter = ref('')
const nozzleFilter = ref('')
const materialFilter = ref('')
const showSliceDetails = ref(true)
const viewMode = ref('list')
const uploadDialogVisible = ref(false)
const createFolderDialogVisible = ref(false)
const creatingFolder = ref(false)
const uploadingFile = ref(null)
const uploadProgress = ref(0)
const uploadError = ref('')
const lastUploadFile = ref(null)
let uploadController = null
// 打印任务对话框状态
const createJobDialogVisible = ref(false)
const submittingJob = ref(false)
const availablePrinters = ref([])
const loadingPrinters = ref(false)
const jobForm = reactive({
  file: null,
  printerId: '',
  priority: 0, // 0-普通, 1-优先, 2-加急
  copies: 1
})

// 文件详情抽屉状态
const detailDrawerVisible = ref(false)
const selectedFile = ref(null)
const FILE_DETAIL_CONTEXT_KEY = 'farm-ui:file-detail'
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

// 分页状态；参考界面默认展示 20 条数据。
const pagination = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0
})

// 计算文件夹和文件列表
const folderList = computed(() => {
  return fileList.value.filter(file => file.folder)
})

const filteredFolderList = computed(() => {
  const keyword = folderSearchKeyword.value.trim().toLowerCase()
  if (!keyword) return folderList.value
  return folderList.value.filter(file => file.originalName.toLowerCase().includes(keyword))
})

const displayFileList = computed(() => {
  const model = modelFilter.value
  const nozzle = nozzleFilter.value

  return fileList.value.filter(file => {
    if (file.folder) return true
    if (model && getCompatibleModel(file) !== model) return false
    if (nozzle && String(file.nozzleSize ?? '') !== nozzle) return false
    return true
  })
})

const displayTotal = computed(() => {
  return modelFilter.value || nozzleFilter.value ? displayFileList.value.length : pagination.total
})

const restoreFileDetailContext = () => {
  const fileId = sessionStorage.getItem(FILE_DETAIL_CONTEXT_KEY)
  if (!fileId || selectedFile.value) return

  const file = fileList.value.find(item => String(item.id) === fileId)
  if (file) openFileDetail(file)
}

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
      fileName: searchKeyword.value || undefined,
      materialType: materialFilter.value || undefined,
      parentId: currentParentId.value
    }
    const res = await getFileList(params)
    fileList.value = res.data?.records || []
    pagination.total = res.data?.total || 0

    // 清空选中状态（如果当前页数据变化）
    selectedIds.value = []
    restoreFileDetailContext()
  } catch (error) {
    console.error('获取文件列表失败:', error)
    message.error('获取文件列表失败')
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
    message.success('文件夹创建成功')
    createFolderDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('创建文件夹失败:', error)
    message.error('创建文件夹失败')
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
const handlePageChange = ({ current, pageSize }) => {
  pagination.pageNum = current
  pagination.pageSize = pageSize
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
const handleFileChange = async (files) => {
  if (uploadingFile.value) return
  const latestFile = Array.isArray(files) ? files.at(-1) : files
  const file = latestFile?.raw || latestFile
  if (!file) return

  // 验证文件类型
  if (!/\.(gcode|g|3mf|stl)$/i.test(file.name)) {
    message.warning('请上传 .gcode、.g、.3mf 或 .stl 文件')
    return
  }

  if (file.size > 200 * 1024 * 1024) {
    message.warning('文件大小不能超过 200MB')
    return
  }
  if (fileList.value.some(item => !item.folder && item.originalName === file.name)) {
    message.warning('当前目录已存在同名文件，请先重命名后再上传')
    return
  }

  const formData = new FormData()
  formData.append('file', file)
  if (currentParentId.value !== null) formData.append('parentId', String(currentParentId.value))

  uploadingFile.value = file
  lastUploadFile.value = file
  uploadError.value = ''
  uploadProgress.value = 0
  uploadController = new AbortController()
  try {
    await uploadPrintFile(formData, event => {
      if (event?.total) uploadProgress.value = Math.min(Math.round((event.loaded / event.total) * 100), 99)
    }, { signal: uploadController.signal })
    message.success('文件上传成功')
    uploadDialogVisible.value = false
    uploadingFile.value = null
    uploadProgress.value = 0
    fetchData()
  } catch (error) {
    console.error('上传失败:', error)
    if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
      message.info('上传已取消')
    } else {
      uploadError.value = error?.message || '上传失败，可重试'
      message.error('上传失败，可点击重试')
    }
  }
  uploadController = null
}

const cancelUpload = () => {
  uploadController?.abort()
}

const retryUpload = () => {
  if (lastUploadFile.value) handleFileChange([lastUploadFile.value])
}

/**
 * 删除单个文件
 */
const handleDelete = async (id) => {
  try {
    await confirmMessage('确定要删除吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteFile(id)
    message.success('删除成功')

    // 从选中列表中移除
    const index = selectedIds.value.indexOf(id)
    if (index > -1) {
      selectedIds.value.splice(index, 1)
    }

    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }
}

/**
 * 批量删除
 */
const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) return

  try {
    await confirmMessage(
      `确定要删除选中的 ${selectedIds.value.length} 个项目吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteBatchFiles(selectedIds.value)
    message.success('批量删除成功')
    selectedIds.value = []
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      message.error('批量删除失败')
    }
  }
}

/**
 * 发送打印
 */
const handlePrint = (file) => {
  jobForm.file = file
  jobForm.priority = 0
  jobForm.copies = 1
  jobForm.printerId = ''
  createJobDialogVisible.value = true
  loadAssignablePrinters()
}

/**
 * 从文件详情抽屉发送打印
 */
const handlePrintFromDetail = (file) => {
  jobForm.file = file
  jobForm.priority = 0
  jobForm.copies = 1
  jobForm.printerId = ''
  createJobDialogVisible.value = true
  loadAssignablePrinters()
}

/**
 * 提交创建打印任务
 */
const loadAssignablePrinters = async () => {
  loadingPrinters.value = true
  try {
    const res = await getPrinterList({ pageNum: 1, pageSize: 100, status: 'IDLE' })
    availablePrinters.value = (res.data?.records || []).filter(printer => printer.status === 'IDLE')
  } catch (error) {
    availablePrinters.value = []
    console.error('获取可用打印机失败:', error)
  } finally {
    loadingPrinters.value = false
  }
}

const handleSubmitCreateJob = async () => {
  if (!jobForm.file) {
    message.error('未选择文件')
    return
  }

  submittingJob.value = true
  try {
    // 构建请求数据 - 直接使用数字优先级 (0-普通, 1-优先, 2-加急)
    const baseJobData = {
      fileId: jobForm.file.id,
      priority: jobForm.priority,
      ...(jobForm.printerId ? { printerId: jobForm.printerId } : {})
    }

    // 根据打印份数创建任务
    const promises = []
    for (let i = 0; i < jobForm.copies; i++) {
      const idempotencyKey = `file-${jobForm.file.id}-${Date.now()}-${i}`
      promises.push(createPrintJob({ ...baseJobData, idempotencyKey }, {
        dedupeKey: idempotencyKey
      }))
    }

    // 并发执行所有请求
    await Promise.all(promises)

    message.success('任务已成功加入队列')
    createJobDialogVisible.value = false
  } catch (error) {
    console.error('创建打印任务失败:', error)
    message.error(error.message || '创建打印任务失败')
  } finally {
    submittingJob.value = false
  }
}

/**
 * 打开上传对话框
 */
const handleUpload = () => {
  uploadingFile.value = null
  uploadProgress.value = 0
  uploadError.value = ''
  lastUploadFile.value = null
  uploadDialogVisible.value = true
}

/**
 * 获取材质标签类型
 */
const getMaterialTagType = (materialType) => {
  const types = {
    PLA: 'success',
    ABS: 'warning',
    PETG: 'primary',
    TPU: 'default',
    尼龙: 'danger'
  }
  return types[materialType] || 'default'
}

/**
 * 打开文件详情
 */
const openFileDetail = (file, event) => {
  if (event) event.stopPropagation()
  selectedFile.value = { ...file, thumbnailUrl: null }
  sessionStorage.setItem(FILE_DETAIL_CONTEXT_KEY, String(file.id))
  detailDrawerVisible.value = true

  Promise.all([
    getFilePreview(file.id),
    getThumbnailUrl(file.id).catch(() => ({ data: null }))
  ]).then(([preview, thumbnail]) => {
    if (selectedFile.value && String(selectedFile.value.id) === String(file.id)) {
      selectedFile.value = {
        ...selectedFile.value,
        ...preview.data,
        thumbnailUrl: thumbnail.data || null
      }
    }
  }).catch(() => {
    // 列表数据仍可用于展示，详情接口错误由请求层统一提示。
  })
}

/**
 * 关闭文件详情
 */
const closeFileDetail = () => {
  detailDrawerVisible.value = false
  selectedFile.value = null
  sessionStorage.removeItem(FILE_DETAIL_CONTEXT_KEY)
}

/**
 * 处理文件下载
 */
const handleFileDownload = async (file) => {
  if (!file?.id) {
    message.error('文件信息不完整')
    return
  }
  try {
    await downloadFile(file.id, file.originalName)
  } catch (error) {
    // 下载接口本身的鉴权错误已由请求拦截器提示；这里处理预签名 URL 阶段的错误。
    if (error?.name === 'DownloadFileError') {
      message.error(error.message)
    }
  }
}

/**
 * 处理文件点击事件
 */
const handleFileClick = (file) => {
  if (file.folder) {
    navigateToFolder(file)
  } else {
    openFileDetail(file)
  }
}

/**
 * 处理表格行点击事件
 */
const handleTableRowClick = (row) => {
  if (row.folder) {
    navigateToFolder(row)
  } else {
    openFileDetail(row)
  }
}

const formatFileDate = value => {
  if (!value) return '--'
  return String(value).replace('T', ' ').replace(/\.\d+$/, '')
}

const formatNozzle = value => {
  const nozzle = Number(value)
  return Number.isFinite(nozzle) ? `${nozzle.toFixed(1)}mm` : '--'
}

const formatBedTemperature = value => {
  const temperature = Number(value)
  return Number.isFinite(temperature) ? `热床 ${temperature}°C` : '热床 --'
}

const getCompatibleModel = file => file.machineModel || file.model || '--'

const getFileTypeLabel = file => {
  if (file.folder) return '文件夹'
  const extension = file.originalName?.split('.').pop()?.toLowerCase()
  return extension === '3mf' ? '3MF' : extension === 'bgcode' ? 'BG-Code' : 'G-Code'
}

const getFolderDescription = folder => {
  if (Number.isFinite(Number(folder.fileCount))) return `包含 ${folder.fileCount} 个切片文件`
  return '文件夹'
}

// ============ 生命周期 ============
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.file-library-page {
  --file-primary: #00b96b;
  --file-primary-hover: #059669;
  --file-border: #e5e7eb;
  --file-muted: #6b7280;
  --file-subtle: #9ca3af;
  color: #334155;
}

.file-library-layout {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #fff;
}

.file-library-sidebar {
  display: flex;
  flex: 0 0 200px;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--file-border);
  background: #fff;
}

.file-library-sidebar__header,
.file-library-header,
.file-library-filters,
.file-library-footer {
  display: flex;
  align-items: center;
}

.file-library-sidebar__header {
  height: 2.75rem;
  justify-content: space-between;
  padding: 0 0.875rem;
  border-bottom: 1px solid #f1f5f9;
}

.file-library-sidebar__title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: #374151;
  font-size: 0.8125rem;
  font-weight: 600;
}

.file-library-sidebar__title :deep(svg) {
  color: var(--file-muted);
}

.file-library-sidebar__header :deep(.t-button) {
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  color: var(--file-muted);
  font-size: 1rem;
}

.file-library-sidebar__search {
  padding: 0.75rem 0.625rem 0.5rem;
}

.file-library-sidebar__search :deep(.t-input) {
  background: #f8fafc;
}

.file-library-folder-nav {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 0.25rem;
  overflow-y: auto;
}

.file-library-folder-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
  margin: 0.125rem 0;
  padding: 0.45rem 0.625rem;
  border: 0;
  border-radius: 0.375rem;
  color: var(--file-muted);
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.file-library-folder-item:hover {
  color: #374151;
  background: #f8fafc;
}

.file-library-folder-item--active {
  color: #059669;
  background: #ecfdf5;
  font-weight: 600;
}

.file-library-folder-item__name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.file-library-folder-item__name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-library-folder-item__count {
  flex-shrink: 0;
  margin-left: 0.375rem;
  color: var(--file-subtle);
  font-size: 0.6875rem;
}

.file-library-folder-item--active .file-library-folder-item__count {
  color: #059669;
}

.file-library-storage {
  flex: 0 0 auto;
  padding: 0.75rem;
  border-top: 1px solid #f1f5f9;
  color: var(--file-muted);
  font-size: 0.6875rem;
}

.file-library-storage__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}

.file-library-storage__value {
  color: #374151;
  font-weight: 600;
  white-space: nowrap;
}

.file-library-storage__value em {
  color: var(--file-subtle);
  font-style: normal;
  font-weight: 400;
}

.file-library-storage__track {
  height: 0.375rem;
  overflow: hidden;
  border-radius: 999px;
  background: #f1f5f9;
}

.file-library-storage__track span {
  display: block;
  width: 19.37%;
  height: 100%;
  border-radius: inherit;
  background: var(--file-primary);
}

.file-library-main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #fff;
}

.file-library-header {
  flex: 0 0 auto;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.file-library-header__breadcrumb {
  min-width: 0;
}

.file-library-header__breadcrumb :deep(.t-breadcrumb__inner) {
  color: var(--file-muted);
  font-size: 0.75rem;
}

.file-library-header__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
}

.file-library-header__actions :deep(.t-button) {
  white-space: nowrap;
}

.file-view-toggle {
  display: flex;
  align-items: center;
  padding: 0.125rem;
  border: 1px solid var(--file-border);
  border-radius: 0.375rem;
  background: #f8fafc;
}

.file-view-toggle :deep(.t-button) {
  min-width: 2rem;
  color: var(--file-muted);
}

.file-view-toggle :deep(.file-view-toggle__active) {
  color: var(--file-primary);
  background: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 8%);
}

.file-library-filters {
  flex: 0 0 auto;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
}

.file-library-filters__fields {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-width: 0;
}

.file-library-filters__search {
  width: min(16rem, 100%);
}

.file-library-filters__select {
  width: 9.5rem;
}

.file-library-filters__details {
  flex: 0 0 auto;
  color: var(--file-muted);
  white-space: nowrap;
}

.file-library-table-area {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.file-library-list-view {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.file-library-table {
  height: 100%;
}

.file-library-table :deep(.t-table__content) {
  overflow-y: auto;
}

.file-library-table :deep(.t-table th) {
  color: var(--file-muted);
  background: #f8fafc;
  font-weight: 400;
}

.file-library-table :deep(.t-table td),
.file-library-table :deep(.t-table th) {
  height: 3.75rem;
  padding: 0.625rem 0.75rem;
  border-color: #f1f5f9;
}

.file-library-table :deep(.t-table__body tr:hover td) {
  background: #f8fafc;
}

.file-library-name-cell {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

.file-library-name-cell__icon {
  display: flex;
  flex: 0 0 2rem;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  overflow: hidden;
  border-radius: 0.375rem;
  color: #64748b;
  background: #f1f5f9;
}

.file-library-name-cell__icon--folder {
  color: #f59e0b;
  background: #fffbeb;
}

.file-library-name-cell__icon :deep(.t-image) {
  width: 100%;
  height: 100%;
}

.file-library-name-cell__content {
  min-width: 0;
}

.file-library-name-cell__title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  color: #1f2937;
  font-size: 0.8125rem;
  font-weight: 600;
}

.file-library-name-cell__title > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-library-name-cell__title :deep(.t-tag) {
  flex-shrink: 0;
  transform: scale(0.9);
  transform-origin: left center;
}

.file-library-name-cell__subtext {
  margin-top: 0.25rem;
  overflow: hidden;
  color: var(--file-subtle);
  font-size: 0.6875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-library-compatibility,
.file-library-material {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  line-height: 1.2;
}

.file-library-compatibility strong,
.file-library-material strong {
  color: #374151;
  font-size: 0.75rem;
  font-weight: 600;
}

.file-library-compatibility span {
  color: var(--file-muted);
  font-size: 0.6875rem;
}

.file-library-material :deep(.t-tag) {
  align-self: flex-start;
}

.file-library-muted {
  color: var(--file-subtle);
}

.file-library-row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  white-space: nowrap;
}

.file-library-row-actions :deep(.t-button) {
  padding-right: 0.5rem;
  padding-left: 0.5rem;
}

.file-library-state {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--file-subtle);
}

.file-library-state p {
  margin: 0;
}

.file-library-footer {
  flex: 0 0 auto;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3rem;
  padding: 0.5rem 1rem;
  border-top: 1px solid #f1f5f9;
  background: #fff;
  color: var(--file-muted);
  font-size: 0.75rem;
}

.file-library-footer__batch,
.file-library-footer__pagination {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.file-library-footer__pagination {
  justify-content: flex-end;
  min-width: 0;
}

.file-library-footer__pagination :deep(.t-pagination) {
  width: auto;
}

.file-grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: 0.75rem;
  align-content: start;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: 1rem;
  overflow-y: auto;
}

.file-card {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 17rem;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #dbe2ea;
  border-radius: 0.5rem;
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.file-card:hover,
.file-card--selected {
  border-color: var(--file-primary);
  box-shadow: 0 4px 12px rgb(15 23 42 / 8%);
}

.file-card__select {
  position: absolute;
  z-index: 1;
  top: 0.5rem;
  left: 0.5rem;
}

.file-card__media {
  position: relative;
  display: flex;
  height: 7rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  color: #64748b;
  background: #f1f5f9;
}

.file-card__media--folder {
  color: #3b82f6;
  background: #eff6ff;
}

.file-card__media :deep(.t-tag) {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}

.file-card__image {
  width: 100%;
  height: 100%;
}

.file-card__media > span {
  font-size: 0.6875rem;
}

.file-card__body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.625rem;
}

.file-card__body h3 {
  margin: 0;
  overflow: hidden;
  color: #1f2937;
  font-size: 0.8125rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-card__folder-meta,
.file-card__metrics,
.file-card__stats {
  color: var(--file-muted);
  font-size: 0.6875rem;
}

.file-card__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.375rem;
}

.file-card__metrics span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-card__stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  border-radius: 0.25rem;
  background: #f1f5f9;
}

.file-card__actions {
  display: flex;
  gap: 0.375rem;
  margin-top: auto;
}

.file-card__actions :deep(.t-button) {
  flex: 1 1 auto;
  min-width: 0;
}

@media (max-width: 1024px) {
  .file-library-sidebar {
    flex-basis: 180px;
  }

  .file-library-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .file-library-header__actions {
    width: 100%;
    justify-content: flex-end;
  }

  .file-library-filters {
    align-items: flex-start;
    flex-direction: column;
  }

  .file-library-filters__details {
    align-self: flex-end;
  }
}

@media (max-width: 640px) {
  .file-library-layout {
    overflow: auto;
  }

  .file-library-sidebar {
    flex-basis: 150px;
  }

  .file-library-header__actions,
  .file-library-filters__fields {
    justify-content: flex-start;
  }

  .file-library-header__actions {
    flex-wrap: wrap;
  }

  .file-library-filters__search,
  .file-library-filters__select {
    width: 100%;
  }

  .file-library-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .file-library-footer__pagination {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
