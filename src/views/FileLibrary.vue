<template>
  <div class="app-page-shell app-page-background">
    <Teleport to=".app-breadcrumb__actions">
      <div class="file-library-toolbar__actions app-page-toolbar__actions">
        <t-space class="file-view-toggle">
          <t-button variant="text" size="small" @click="viewMode = 'grid'"
            :class="{ 'file-view-toggle__active': viewMode === 'grid' }" aria-label="网格视图">
            <Grid />
          </t-button>
          <t-button variant="text" size="small" @click="viewMode = 'list'"
            :class="{ 'file-view-toggle__active': viewMode === 'list' }" aria-label="列表视图">
            <List />
          </t-button>
        </t-space>
        <t-button variant="outline" theme="default" size="medium" :icon="renderIcon(FolderOpened)" @click="openCreateFolderDialog">
          新建文件夹
        </t-button>
        <t-button theme="primary" size="medium" :icon="renderIcon(Upload)" @click="handleUpload">
          上传 G-Code 文件
        </t-button>
        <t-button v-if="isBatchMode && selectedIds.length > 0" theme="danger" size="medium" :icon="renderIcon(Delete)" @click="handleBatchDelete">
          批量删除 ({{ selectedIds.length }})
        </t-button>
        <t-button :icon="renderIcon(Refresh)" :loading="loading || treeLoading" @click="refreshLibrary" size="medium">
          刷新
        </t-button>
      </div>
    </Teleport>

    <div class="file-library-content-card app-page-card p-4 bg-white rounded-xl shadow-sm">
      <t-card class="file-tree-card mb-4" bordered>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-base font-semibold text-gray-900">目录树</div>
              <div class="text-xs text-gray-500 mt-1">来自当前账号可见的文件与文件夹</div>
            </div>
            <t-button variant="text" size="small" :loading="treeLoading" @click="loadFileTree">
              刷新目录
            </t-button>
          </div>
        </template>
        <AsyncState
          v-if="treeLoading || treeError || fileTree.length === 0"
          :loading="treeLoading"
          :error="treeError"
          :empty="fileTree.length === 0"
          empty-description="暂无可见文件或文件夹"
          @retry="loadFileTree"
        />
        <t-tree
          v-else
          :data="fileTree"
          activable
          hover
          :expand-level="1"
          @click="handleTreeClick"
        />
      </t-card>

      <!-- 搜索与筛选 -->
      <div class="file-library-filter-row mb-4">
        <t-breadcrumb separator="/" class="file-library-navigation">
          <t-breadcrumb-item :to="{ path: '' }" @click.prevent="navigateToRoot">
            <span><folder-opened /></span>
            <span>根目录</span>
          </t-breadcrumb-item>
          <t-breadcrumb-item
            v-for="(breadcrumb, index) in breadcrumbs"
            :key="breadcrumb.id"
            @click.prevent="navigateTo(index)"
          >
            {{ breadcrumb.name }}
          </t-breadcrumb-item>
        </t-breadcrumb>
        <div class="file-library-toolbar__filters">
          <t-switch v-model="isBatchMode" :label="['批量操作', '详情查看']" />
          <t-input v-model="searchKeyword" placeholder="搜索文件名..." clearable class="w-full sm:w-52" size="medium"
            @keyup.enter="handleSearch">
            <template #prefixIcon>
              <Search />
            </template>
          </t-input>
          <t-input v-model="materialFilter" placeholder="材质筛选" clearable class="w-full sm:w-40" size="medium"
            @change="handleSearch" @keyup.enter="handleSearch">
          </t-input>
        </div>
      </div>

      <!-- 文件列表区 -->
      <AsyncState
        v-if="loading || loadError || fileList.length === 0"
        :loading="loading"
        :error="loadError"
        :empty="fileList.length === 0"
        empty-description="暂无文件，请上传 G-Code 文件"
        @retry="fetchData"
      />
      <div v-else class="flex-1 min-h-0 overflow-hidden flex flex-col">
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
            <t-checkbox :checked="selectedIds.includes(file.id)" disabled
              @click.stop="toggleSelection(file.id)"
              size="small" />
          </div>

          <!-- 文件夹图标 -->
          <div class="file-card__media relative h-24 overflow-hidden bg-blue-50 flex items-center justify-center">
            <IconFolder :size="64" class="text-blue-500" />
          </div>

          <!-- 卡片内容 -->
          <div class="file-card__body p-2">
            <h3 class="text-sm font-semibold text-gray-900 mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap"
              :title="file.originalName">
              {{ file.originalName }}
            </h3>

            <!-- 文件夹统计 -->
            <div class="file-card__stats flex items-center justify-between p-2 bg-gray-100 rounded text-sm mb-3">
              <div class="flex flex-col gap-0.5">
                <span class="text-xs text-gray-600 uppercase">类型</span>
                <span class="text-sm font-semibold text-gray-900">文件夹</span>
              </div>
            </div>

            <!-- 悬浮操作按钮 -->
            <div class="file-card__actions flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:opacity-100">
              <t-button theme="primary" size="small" :icon="renderIcon(FolderOpened)" @click.stop="navigateToFolder(file)"
                class="flex-1 text-xs px-1 py-1">
                打开
              </t-button>
              <t-button theme="danger" size="small" :icon="renderIcon(Delete)" @click.stop="handleDelete(file.id)"
                class="flex-1 text-xs px-1 py-1">
                删除
              </t-button>
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
            <t-checkbox :checked="selectedIds.includes(file.id)" @click.stop="toggleSelection(file.id)"
              size="small" />
          </div>

          <!-- 缩略图区域 -->
          <div class="file-card__media relative h-24 overflow-hidden bg-gray-100">
            <t-image v-if="file.thumbnailUrl" :src="file.thumbnailUrl" :alt="file.originalName" fit="cover"
              class="w-full h-full">
              <template #error>
                <div class="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-1">
                  <Picture :size="36" />
                  <span class="text-sm">加载失败</span>
                </div>
              </template>
            </t-image>
            <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-1">
              <Document :size="36" />
              <span class="text-sm">NO IMAGE</span>
            </div>
            <!-- 材质标签 -->
            <t-tag :theme="getMaterialTagType(file.materialType)" class="absolute top-2 right-2 z-5" size="small">
              {{ file.materialType || '未指定' }}
            </t-tag>
          </div>

          <!-- 卡片内容 -->
          <div class="file-card__body p-2">
            <h3 class="text-sm font-semibold text-gray-900 mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap"
              :title="file.originalName">
              {{ file.originalName }}
            </h3>

            <!-- 核心数据指标 -->
            <div class="file-card__metrics flex gap-2 mb-2">
              <div class="flex items-center gap-1 text-xs text-gray-600">
                <Clock :size="14" class="text-gray-600" />
                <span>{{ formatDuration(file.estTime) }}</span>
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-600">
                <ScaleToOriginal :size="14" class="text-gray-600" />
                <span>{{ formatMetric(file.filamentWeight, 'g') }}</span>
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-600">
                <FullScreen :size="14" class="text-gray-600" />
                <span>{{ formatMetric(file.filamentLength, 'm') }}</span>
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-600">
                <span>{{ formatFileSize(file.fileSize) }}</span>
              </div>
            </div>

            <!-- 统计信息 -->
            <div class="file-card__stats flex items-center justify-between p-2 bg-gray-100 rounded text-sm mb-3">
              <div class="flex flex-col gap-0.5">
                <span class="text-xs text-gray-600 uppercase">打印</span>
                <span class="text-sm font-semibold text-gray-900">{{ formatMetric(file.printCount, '次') }}</span>
              </div>
              <div class="flex items-center gap-2 flex-1 ml-2">
                <span class="text-xs text-gray-600 w-8">成功率</span>
                <t-progress v-if="hasValue(file.successRate)" :percentage="file.successRate" :stroke-width="4" :label="false"
                  :class="getSuccessRateClass(file.successRate)" class="flex-1" />
                <span class="text-sm font-semibold text-gray-900 w-10 text-right">{{ formatMetric(file.successRate, '%') }}</span>
              </div>
            </div>

            <!-- 悬浮操作按钮 -->
            <div class="file-card__actions flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:opacity-100">
              <t-button theme="primary" size="small" :icon="renderIcon(Printer)" @click.stop="handlePrint(file)"
                class="flex-1 text-xs px-1 py-1">
                打印
              </t-button>
              <t-button theme="danger" size="small" :icon="renderIcon(Delete)" @click.stop="handleDelete(file.id)"
                class="flex-1 text-xs px-1 py-1">
                删除
              </t-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-else class="overflow-hidden flex-1">
        <TdTable :data="fileList" :loading="loading" @selection-change="handleSelectionChange"
          @row-click="handleTableRowClick" border stripe style="width: 100%" height="100%">
          <TdTableColumn type="selection" width="50" align="center" />

          <TdTableColumn prop="originalName" label="文件名" min-width="200">
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                  <span v-if="row.folder" class="text-blue-500">
                    <IconFolder />
                  </span>
                  <t-image v-else-if="row.thumbnailUrl" :src="row.thumbnailUrl" fit="cover" class="w-full h-full" />
                  <span v-else class="text-gray-600">
                    <Document />
                  </span>
                </div>
                <span class="text-sm font-medium text-gray-900 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                  :title="row.originalName">{{
                    row.originalName
                  }}</span>
                <t-tag v-if="row.folder" size="small" class="flex-shrink-0">
                  文件夹
                </t-tag>
                <t-tag v-else :theme="getMaterialTagType(row.materialType)" size="small" class="flex-shrink-0">
                  {{ row.materialType || '未指定' }}
                </t-tag>
              </div>
            </template>
          </TdTableColumn>

          <TdTableColumn prop="fileSize" label="文件大小" width="100" v-if="currentParentId">
            <template #default="{ row }">{{ row.folder ? '-' : formatFileSize(row.fileSize) }}</template>
          </TdTableColumn>

          <TdTableColumn prop="estTime" label="预计耗时" width="85" v-if="currentParentId">
            <template #default="{ row }">{{ row.folder ? '文件夹' : formatDuration(row.estTime) }}</template>
          </TdTableColumn>

          <TdTableColumn prop="filamentWeight" label="耗材重量" width="85" v-if="currentParentId">
            <template #default="{ row }">{{
              row.folder ? '-' : formatMetric(row.filamentWeight, 'g')
              }}</template>
          </TdTableColumn>

          <TdTableColumn prop="filamentLength" label="所需线长" width="85" v-if="currentParentId">
            <template #default="{ row }">{{
              row.folder ? '-' : formatMetric(row.filamentLength, 'm')
              }}</template>
          </TdTableColumn>

          <TdTableColumn prop="printCount" label="打印次数" width="80" v-if="currentParentId">
            <template #default="{ row }">{{ row.folder ? '-' : formatMetric(row.printCount, '次') }}</template>
          </TdTableColumn>

          <TdTableColumn prop="successRate" label="成功率" width="100" v-if="currentParentId">
            <template #default="{ row }">
              <div class="flex items-center gap-2" v-if="!row.folder && hasValue(row.successRate)">
                <t-progress :percentage="row.successRate" :stroke-width="6" :label="false"
                  :class="getSuccessRateClass(row.successRate)" class="w-16" />
                <span class="text-sm">{{ formatMetric(row.successRate, '%') }}</span>
              </div>
              <span v-else>-</span>
            </template>
          </TdTableColumn>

          <TdTableColumn label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center gap-1">
                <t-button v-if="row.folder" theme="primary" size="small" :icon="renderIcon(FolderOpened)" @click="navigateToFolder(row)">
                  打开
                </t-button>
                <t-button v-else theme="primary" size="small" :icon="renderIcon(Printer)" @click="handlePrint(row)">
                  打印
                </t-button>
                <t-button theme="danger" size="small" :icon="renderIcon(Delete)" @click="handleDelete(row.id)">
                  删除
                </t-button>
              </div>
            </template>
          </TdTableColumn>
        </TdTable>
      </div>
    </div>

      <!-- 分页 -->
      <div v-if="fileList.length > 0" class="flex justify-center pt-2 shrink-0">
      <t-pagination v-model:current="pagination.pageNum" v-model:pageSize="pagination.pageSize"
        :total="pagination.total" :show-page-size="false"
        @change="handlePageChange" class="p-4" />
      </div>
    </div>

    <!-- 文件上传对话框 -->
    <t-dialog v-model:visible="uploadDialogVisible" header="批量上传切片文件" width="600px" :footer="false">
      <t-upload theme="custom" draggable multiple :auto-upload="false" accept=".gcode,.g,.3mf,.stl"
        @select-change="handleFileSelect" class="p-4">
        <span class="farm-icon--upload">
          <UploadFilled />
        </span>
        <div class="farm-upload__text">
          拖拽多个切片文件到此处 或 <em>点击上传</em>
        </div>
        <template #tips>
          <div class="farm-upload__tip">
            支持 .gcode、.g、.3mf、.stl 格式，单次最多 100 个、总大小不超过 250MB
          </div>
        </template>
      </t-upload>
      <div v-if="pendingUploadFiles.length" class="px-4 pb-4 space-y-3">
        <div class="text-sm text-gray-600">待上传文件（{{ pendingUploadFiles.length }}）</div>
        <div v-for="file in pendingUploadFiles" :key="`${file.name}-${file.lastModified}`"
          class="flex items-center justify-between gap-3 text-sm">
          <span class="min-w-0 truncate" :title="file.name">{{ file.name }}</span>
          <span class="shrink-0 text-gray-500">{{ batchUploading ? `${uploadProgress}%` : '待上传' }}</span>
        </div>
        <t-progress v-if="batchUploading" :percentage="uploadProgress" />
        <div class="flex justify-end gap-2">
          <t-button variant="outline" :disabled="batchUploading" @click="handleUpload">重新选择</t-button>
          <t-button variant="outline" :disabled="!batchUploading" @click="cancelUpload">取消上传</t-button>
          <t-button theme="primary" :loading="batchUploading" @click="submitBatchUpload">开始上传</t-button>
        </div>
      </div>
      <div v-if="batchUploadResults.length" class="px-4 pb-4 space-y-2">
        <t-alert
          :theme="batchUploadResults.every(isBatchUploadSuccess) ? 'success' : 'warning'"
          :title="batchUploadResults.every(isBatchUploadSuccess) ? '全部文件上传成功' : '部分文件未上传成功'"
          :close-btn="false"
        />
        <div v-for="result in batchUploadResults" :key="`${result.index}-${result.fileName}`"
          class="flex items-center justify-between gap-3 text-sm">
          <span class="min-w-0 truncate" :title="result.fileName">{{ result.fileName || `第 ${result.index + 1} 项` }}</span>
          <span :class="isBatchUploadSuccess(result) ? 'text-green-600' : 'text-red-600'">
            {{ isBatchUploadSuccess(result) ? '成功' : (result.message || '失败') }}
          </span>
        </div>
        <t-button v-if="pendingUploadFiles.length" size="small" theme="primary" @click="submitBatchUpload">
          重试可重试失败项（{{ pendingUploadFiles.length }}）
        </t-button>
      </div>
      <div v-if="uploadError" class="px-4 pb-4">
        <t-alert theme="error" :title="uploadError" :close-btn="false" />
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
      :loading="detailLoading"
      :error="detailError"
      :jobs="detailJobs"
      :jobs-loading="detailJobsLoading"
      :jobs-error="detailJobsError"
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
              <t-radio :value="50">
                <span class="text-yellow-600">优先</span>
              </t-radio>
              <t-radio :value="100">
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
  ImageIcon as Picture,
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
  getThumbnailUrl,
  getFileJobs,
  getFileTree,
  batchUploadFiles
} from '@/api/printFile'
import { createPrintJob } from '@/api/job'
import { getPrinterList } from '@/api/printer'
import { formatDuration, formatFileSize } from '@/utils/formatters'
import FileDetailDrawer from '@/components/file/FileDetailDrawer.vue'
import IconFolder from '@/components/icons/IconFolder.vue'
import AsyncState from '@/components/AsyncState.vue'
import TdTable from '@/components/TdTable.vue'
import TdTableColumn from '@/components/TdTableColumn.vue'
import {
  isBatchUploadSuccess,
  normalizeBatchUploadResult,
  validateBatchUploadSelection
} from '@/utils/batchUpload'
import { chunkItems, runUploadQueue } from '@/utils/uploadQueue'

defineOptions({ name: 'FileLibrary' })

// ============ 状态定义 ============
const loading = ref(false)
const loadError = ref('')
const fileList = ref([])
const treeLoading = ref(false)
const treeError = ref('')
const fileTree = ref([])
const selectedIds = ref([])
const searchKeyword = ref('')
const materialFilter = ref('')
// 后端当前不支持标签筛选，避免向接口发送未定义参数。
const viewMode = ref('grid')
const uploadDialogVisible = ref(false)
const createFolderDialogVisible = ref(false)
const creatingFolder = ref(false)
const pendingUploadFiles = ref([])
const batchUploadResults = ref([])
const batchUploading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref('')
const UPLOAD_BATCH_SIZE = 5
let uploadController = null
// 打印任务对话框状态
const createJobDialogVisible = ref(false)
const submittingJob = ref(false)
const availablePrinters = ref([])
const loadingPrinters = ref(false)
const jobForm = reactive({
  file: null,
  printerId: '',
  priority: 0, // 0-普通, 50-优先, 100-加急
  copies: 1
})

// 文件详情抽屉状态
const detailDrawerVisible = ref(false)
const selectedFile = ref(null)
const detailLoading = ref(false)
const detailError = ref('')
const detailJobs = ref([])
const detailJobsLoading = ref(false)
const detailJobsError = ref('')
const FILE_DETAIL_CONTEXT_KEY = 'farm-ui:file-detail'
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
  return fileList.value.filter(file => file.folder)
})

const fileItemsList = computed(() => {
  return fileList.value.filter(file => !file.folder)
})

const hasValue = value => value !== undefined && value !== null && value !== ''

const formatMetric = (value, suffix = '') => hasValue(value) ? `${value}${suffix}` : '-'

const normalizeTreeNode = node => ({
  value: String(node.id),
  label: node.name,
  name: node.name,
  folder: node.folder === true,
  id: node.id,
  parentId: node.parentId ?? null,
  fileSize: node.fileSize,
  materialType: node.materialType,
  createdAt: node.createdAt,
  children: Array.isArray(node.children) ? node.children.map(normalizeTreeNode) : []
})

const treeNodeToFile = node => ({
  id: node.id,
  parentId: node.parentId ?? null,
  folder: node.folder === true,
  originalName: node.name,
  fileSize: node.fileSize,
  materialType: node.materialType,
  createdAt: node.createdAt
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
  loadError.value = ''
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
    loadError.value = error?.message || '文件列表加载失败，请重试'
    message.error('获取文件列表失败')
  } finally {
    loading.value = false
  }
}

const loadFileTree = async () => {
  treeLoading.value = true
  treeError.value = ''
  try {
    const response = await getFileTree()
    fileTree.value = (Array.isArray(response.data) ? response.data : []).map(normalizeTreeNode)
  } catch (error) {
    console.error('获取文件目录树失败:', error)
    treeError.value = error?.message || '目录树加载失败，请重试'
    message.error('获取文件目录树失败')
  } finally {
    treeLoading.value = false
  }
}

const refreshLibrary = () => Promise.all([fetchData(), loadFileTree()])

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

const handleTreeClick = ({ node }) => {
  if (!node?.data) return
  if (node.data.folder) {
    const path = typeof node.getPath === 'function' ? node.getPath() : []
    breadcrumbs.value = path
      .filter(pathNode => pathNode.data?.folder)
      .map(pathNode => ({
        id: pathNode.data.id,
        name: pathNode.data.label || pathNode.data.name
      }))
    currentParentId.value = node.data.id
    pagination.pageNum = 1
    fetchData()
    return
  }
  openFileDetail(treeNodeToFile(node.data))
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
    refreshLibrary()
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
  selectedIds.value = selection.filter(item => !item.folder).map(item => item.id)
}

/**
 * 选择批量上传文件
 */
const handleFileSelect = (files) => {
  if (batchUploading.value) return
  const selectedFiles = (Array.isArray(files) ? files : [files])
    .map(file => file?.raw || file)
    .filter(Boolean)
  const existingNames = fileList.value
    .filter(item => !item.folder)
    .map(item => item.originalName)
  const validation = validateBatchUploadSelection(selectedFiles, existingNames)
  pendingUploadFiles.value = validation.files
  batchUploadResults.value = []
  uploadError.value = validation.rejected.map(item => item.reason).join('；')
  uploadProgress.value = 0
  if (validation.rejected.length > 0) {
    message.warning(`已忽略 ${validation.rejected.length} 个不可上传文件`)
  }
}

const submitBatchUpload = async () => {
  if (batchUploading.value || pendingUploadFiles.value.length === 0) return

  const files = pendingUploadFiles.value.slice()
  batchUploading.value = true
  uploadError.value = ''
  uploadProgress.value = 0
  uploadController = new AbortController()
  try {
    let result
    const onUploadProgress = event => {
      if (event?.total) uploadProgress.value = Math.min(Math.round((event.loaded / event.total) * 100), 99)
    }
    if (files.length === 1) {
      const formData = new FormData()
      formData.append('file', files[0])
      if (currentParentId.value !== null) formData.append('parentId', String(currentParentId.value))
      const response = await uploadPrintFile(formData, onUploadProgress, { signal: uploadController.signal })
      result = {
        items: [{
          index: 0,
          fileId: response.data?.id ?? null,
          fileName: response.data?.originalName || files[0].name,
          status: 'SUCCESS',
          errorCode: null,
          message: '上传成功',
          retryable: false
        }]
      }
    } else {
      const chunks = chunkItems(files, UPLOAD_BATCH_SIZE)
      const chunkLoaded = new Map()
      const totalBytes = files.reduce((total, file) => total + (Number(file.size) || 0), 0)
      const queueResults = await runUploadQueue(chunks, async (chunk, chunkIndex) => {
        const chunkProgress = event => {
          chunkLoaded.set(chunkIndex, event?.loaded || 0)
          const loaded = [...chunkLoaded.values()].reduce((total, value) => total + value, 0)
          onUploadProgress({ loaded, total: totalBytes })
        }
        return batchUploadFiles(chunk, currentParentId.value, chunkProgress, {
          signal: uploadController.signal
        })
      }, {
        concurrency: 3,
        signal: uploadController.signal
      })
      const items = []
      queueResults.forEach((queueResult, chunkIndex) => {
        const offset = chunkIndex * UPLOAD_BATCH_SIZE
        const chunk = chunks[chunkIndex]
        if (queueResult.status === 'fulfilled') {
          normalizeBatchUploadResult(queueResult.value).items.forEach(item => {
            const file = chunk[item.index]
            items.push({ ...item, index: offset + item.index, fileName: item.fileName || file?.name || '' })
          })
        } else {
          chunk.forEach((file, itemIndex) => items.push({
            index: offset + itemIndex,
            fileId: null,
            fileName: file.name,
            status: 'FAILED',
            errorCode: queueResult.reason?.response?.status || null,
            message: queueResult.reason?.message || '上传失败，可重试',
            retryable: true
          }))
        }
      })
      result = { items: items.sort((left, right) => left.index - right.index) }
    }

    const items = normalizeBatchUploadResult(result).items
    batchUploadResults.value = items
    const successfulItems = items.filter(isBatchUploadSuccess)
    const retryableFiles = items
      .filter(item => !isBatchUploadSuccess(item) && item.retryable)
      .map(item => files[item.index])
      .filter(Boolean)
    pendingUploadFiles.value = retryableFiles

    if (successfulItems.length > 0) await refreshLibrary()
    if (retryableFiles.length === 0 && successfulItems.length === files.length) {
      message.success(`已上传 ${successfulItems.length} 个文件`)
      uploadDialogVisible.value = false
      pendingUploadFiles.value = []
    } else if (successfulItems.length > 0) {
      message.warning(`已上传 ${successfulItems.length} 个文件，${files.length - successfulItems.length} 个失败`)
    } else {
      message.error('文件上传失败，请检查失败项')
    }
  } catch (error) {
    console.error('批量上传失败:', error)
    if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
      message.info('上传已取消')
    } else {
      uploadError.value = error?.message || '上传失败，可重试'
      message.error('上传失败，可重试')
    }
  } finally {
    batchUploading.value = false
    uploadProgress.value = 0
    uploadController = null
  }
}

const cancelUpload = () => {
  uploadController?.abort()
}

/**
 * 删除单个文件
 */
const handleDelete = async (id) => {
  const file = fileList.value.find(item => String(item.id) === String(id))
  if (!file) {
    message.warning('文件信息不存在')
    return
  }

  try {
    await confirmMessage(file.folder ? '确定要删除这个文件夹吗？空文件夹才允许删除。' : '确定要删除吗？', '提示', {
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

    refreshLibrary()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      if (error?.response?.status === 422) {
        message.warning('文件夹删除失败，请先处理文件夹中的内容')
      } else {
        message.error(error?.message || '删除失败')
      }
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

    const response = await deleteBatchFiles(selectedIds.value)
    const items = Array.isArray(response.data?.items) ? response.data.items : []
    if (items.length !== selectedIds.value.length) {
      message.warning('批量删除结果不完整，请刷新后重试未确认的项目')
      await refreshLibrary()
      return
    }
    const failedItems = items.filter(item => !item.success)
    const successItems = items.filter(item => item.success)
    selectedIds.value = failedItems.map(item => item.id)
    if (failedItems.length > 0) {
      const reasons = failedItems.map(item => `${item.id}: ${item.reason || '删除失败'}`).join('；')
      message.warning(`已删除 ${successItems.length} 项，${failedItems.length} 项失败：${reasons}`)
    } else {
      message.success(`批量删除成功，共 ${successItems.length} 项`)
    }
    refreshLibrary()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      message.error(error?.message || '批量删除失败')
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
  let successCount = 0
  try {
    // 构建请求数据 - 直接使用数字优先级 (0-普通, 50-优先, 100-加急)
    const baseJobData = {
      fileId: jobForm.file.id,
      priority: jobForm.priority,
      ...(jobForm.printerId ? { printerId: jobForm.printerId } : {})
    }

    // 多份任务串行创建，指定同一打印机时后端可明确返回部分成功，而不会并发争抢设备。
    for (let i = 0; i < jobForm.copies; i++) {
      const idempotencyKey = `file-${jobForm.file.id}-${Date.now()}-${i}`
      await createPrintJob({ ...baseJobData, idempotencyKey }, { dedupeKey: idempotencyKey })
      successCount += 1
    }

    message.success(`已创建 ${successCount} 个任务`)
    createJobDialogVisible.value = false
  } catch (error) {
    console.error('创建打印任务失败:', error)
    const messageText = error.message || '创建任务失败'
    if (successCount > 0) {
      message.warning(`已创建 ${successCount} 个任务，剩余任务未完成：${messageText}`)
    } else {
      message.error(messageText)
    }
  } finally {
    submittingJob.value = false
  }
}

/**
 * 打开上传对话框
 */
const handleUpload = () => {
  pendingUploadFiles.value = []
  batchUploadResults.value = []
  uploadProgress.value = 0
  uploadError.value = ''
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
  selectedFile.value = { ...file, thumbnailUrl: null, thumbnailError: false }
  detailLoading.value = true
  detailError.value = ''
  detailJobs.value = []
  detailJobsLoading.value = true
  detailJobsError.value = ''
  sessionStorage.setItem(FILE_DETAIL_CONTEXT_KEY, String(file.id))
  detailDrawerVisible.value = true

  Promise.allSettled([
    getFilePreview(file.id),
    getThumbnailUrl(file.id)
  ]).then(([previewResult, thumbnailResult]) => {
    if (selectedFile.value && String(selectedFile.value.id) === String(file.id)) {
      if (previewResult.status === 'fulfilled') {
        selectedFile.value = {
          ...selectedFile.value,
          ...previewResult.value.data
        }
      } else {
        detailError.value = '文件预览信息加载失败，请稍后重试'
      }
      if (thumbnailResult.status === 'fulfilled') {
        selectedFile.value.thumbnailUrl = thumbnailResult.value.data || null
        selectedFile.value.thumbnailError = false
      } else {
        selectedFile.value.thumbnailError = true
      }
    }
  }).finally(() => {
    if (selectedFile.value && String(selectedFile.value.id) === String(file.id)) {
      detailLoading.value = false
    }
  })

  getFileJobs(file.id, { pageNum: 1, pageSize: 10 }).then(response => {
    if (selectedFile.value && String(selectedFile.value.id) === String(file.id)) {
      detailJobs.value = response.data?.records || []
    }
  }).catch(() => {
    if (selectedFile.value && String(selectedFile.value.id) === String(file.id)) {
      detailJobsError.value = '关联任务加载失败，请稍后重试'
    }
  }).finally(() => {
    if (selectedFile.value && String(selectedFile.value.id) === String(file.id)) {
      detailJobsLoading.value = false
    }
  })
}

/**
 * 关闭文件详情
 */
const closeFileDetail = () => {
  detailDrawerVisible.value = false
  selectedFile.value = null
  detailLoading.value = false
  detailJobsLoading.value = false
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
  if (isBatchMode.value) {
    if (file.folder) return
    // 批量操作模式：执行选择操作
    toggleSelection(file.id)
  } else {
    // 详情查看模式：如果是文件夹则打开，否则显示详情
    if (file.folder) {
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
    if (row.folder) {
      navigateToFolder(row)
    } else {
      openFileDetail(row)
    }
  }
}

// ============ 生命周期 ============
onMounted(() => {
  refreshLibrary()
})
</script>

<style scoped>
.file-tree-card :deep(.t-card__body) {
  max-height: 13rem;
  overflow-y: auto;
}

.file-tree-card :deep(.t-tree__label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-library-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
}

.file-library-navigation {
  min-width: 0;
  flex: 1;
}

.file-library-toolbar__filters,
.file-library-toolbar__actions {
  display: flex;
  align-items: center;
}

.file-library-toolbar__filters,
.file-library-toolbar__actions {
  flex-wrap: wrap;
  gap: 0.75rem;
}

.file-library-toolbar__filters {
  flex: 0 0 auto;
  justify-content: flex-end;
}

.file-library-toolbar__actions {
  justify-content: flex-end;
}

.file-view-toggle {
  padding: 0.125rem;
  background: var(--app-surface-muted);
  border: 1px solid var(--app-border);
  border-radius: 0.375rem;
}

.file-view-toggle :deep(.t-button) {
  min-width: 2rem;
  color: var(--app-text-secondary);
}

.file-view-toggle :deep(.file-view-toggle__active) {
  color: var(--app-primary);
  background: var(--app-surface);
  box-shadow: 0 1px 3px rgb(0 0 0 / 8%);
}

/* 网格视图布局 */
.file-grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, clamp(200px, 16vw, 280px)), 1fr));
  gap: clamp(0.75rem, 1vw, 1.25rem);
  align-content: start;
  overflow-y: auto;
  padding-bottom: 1rem;
}

/* 文件卡片样式 */
.file-card {
  height: clamp(260px, 22vw, 320px);
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.file-card__media {
  height: clamp(88px, 8vw, 112px);
  flex-shrink: 0;
}

.file-card__body {
  min-height: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.file-card__body > h3 {
  flex-shrink: 0;
}

.file-card__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
  flex-shrink: 0;
}

.file-card__metrics > div {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.file-card__stats {
  flex-shrink: 0;
}

.file-card__actions {
  flex-shrink: 0;
  margin-top: auto;
}

@media (max-width: 640px) {
  .file-library-filter-row {
    align-items: stretch;
    flex-direction: column;
  }

  .file-library-navigation,
  .file-library-toolbar__filters,
  .file-library-toolbar__actions {
    width: 100%;
  }

  .file-library-toolbar__filters {
    justify-content: flex-end;
  }

  .file-library-toolbar__actions {
    justify-content: flex-start;
  }

  .file-library-toolbar__actions > .t-button {
    flex: 1 1 auto;
  }

  .file-card {
    height: 260px;
  }

  .file-card__media {
    height: 88px;
  }
}

</style>
