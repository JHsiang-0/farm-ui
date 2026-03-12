<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="`绑定设备至 ${targetSlotLabel}`"
    width="700px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <!-- 搜索框 -->
    <div class="mb-4">
      <el-input
        v-model="searchKeyword"
        placeholder="请输入 IP 或机器编号搜索"
        clearable
        prefix-icon="Search"
        @input="handleSearch"
        class="w-full"
      />
    </div>

    <!-- 未分配设备列表 -->
    <el-table
      v-loading="loading"
      :data="filteredList"
      height="400"
      style="width: 100%"
      highlight-current-row
      @row-click="handleRowClick"
    >
      <el-table-column prop="machineNumber" label="机器编号" width="120">
        <template #default="{ row }">
          {{ row.machineNumber || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="ipAddress" label="IP地址" width="125" />
      <el-table-column prop="macAddress" label="MAC地址" width="145" />
      <el-table-column prop="name" label="设备名称" width="130" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="85">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <!-- 空状态提示 -->
    <el-empty v-if="!loading && filteredList.length === 0" description="暂无可绑定的设备" />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { getUnallocatedPrinters } from '@/api/printer'

defineOptions({ name: 'BindDeviceDialog' })

const props = defineProps({
  /** 弹窗可见性 */
  visible: {
    type: Boolean,
    default: false
  },
  /** 目标槽位标签 */
  targetSlotLabel: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'confirm'])

// ============================================
// Reactive State
// ============================================

/** 未分配设备列表 */
const unallocatedList = ref([])
/** 加载状态 */
const loading = ref(false)
/** 搜索关键词 */
const searchKeyword = ref('')

// ============================================
// Constants
// ============================================

/** 状态映射配置 */
const STATUS_MAP = {
  ONLINE: { label: '在线', type: 'success' },
  OFFLINE: { label: '离线', type: 'info' },
  PRINTING: { label: '打印中', type: 'primary' },
  ERROR: { label: '故障', type: 'danger' },
  IDLE: { label: '空闲', type: 'success' }
}

// ============================================
// Computed Properties
// ============================================

/**
 * 根据搜索关键词过滤未分配设备列表
 */
const filteredList = computed(() => {
  if (!searchKeyword.value.trim()) {
    return unallocatedList.value
  }

  const keyword = searchKeyword.value.toLowerCase().trim()
  return unallocatedList.value.filter(device => {
    const ipMatch = device.ipAddress?.toLowerCase().includes(keyword)
    const machineNumMatch = device.machineNumber?.toLowerCase().includes(keyword)
    const nameMatch = device.name?.toLowerCase().includes(keyword)
    return ipMatch || machineNumMatch || nameMatch
  })
})

// ============================================
// Watchers
// ============================================

/** 监听弹窗打开，自动获取数据 */
watch(() => props.visible, (newVal) => {
  if (newVal) {
    fetchUnallocatedDevices()
    searchKeyword.value = ''
  }
})

// ============================================
// Methods
// ============================================

/**
 * 获取状态对应的Element Plus标签类型
 * @param {string} status - 设备状态
 * @returns {string} Element Plus标签类型
 */
function getStatusType(status) {
  const typeMap = {
    ONLINE: 'success',
    OFFLINE: 'info',
    PRINTING: 'primary',
    ERROR: 'danger'
  }
  return typeMap[status] || 'info'
}

/**
 * 获取状态显示标签
 * @param {string} status - 设备状态
 * @returns {string} 状态中文标签
 */
function getStatusLabel(status) {
  return STATUS_MAP[status]?.label || status
}

/**
 * 获取未分配位置的设备列表
 */
async function fetchUnallocatedDevices() {
  loading.value = true
  try {
    const res = await getUnallocatedPrinters()
    unallocatedList.value = res.data || []
  } catch (error) {
    console.error('获取未分配设备失败:', error)
    unallocatedList.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 处理搜索输入
 */
function handleSearch() {
  // 搜索逻辑由 computed 属性 filteredList 自动处理
}

/**
 * 处理表格行点击 - 直接确认绑定
 * @param {Object} row - 点击的行数据
 */
function handleRowClick(row) {
  if (!row) return

  ElMessageBox.confirm(
    `确定要将设备 "${row.name}" 绑定到 ${props.targetSlotLabel} 吗？`,
    '确认绑定',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    emit('confirm', row.id)
  }).catch(() => {
    // 用户取消，不做任何操作
  })
}
</script>

<style scoped>
</style>
