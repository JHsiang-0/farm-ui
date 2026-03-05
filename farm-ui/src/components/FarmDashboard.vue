<template>
  <div class="factory-dashboard">
    <!-- 厂房标题和统计 -->
    <div class="factory-header">
      <div class="header-left">
        <h2 class="factory-title">
          <el-icon :size="24" color="var(--el-color-primary)"><office-building /></el-icon>
          一号厂房
        </h2>
        <div class="factory-stats">
          <el-tag type="success" effect="light" size="small">打印中: {{ printingCount }}</el-tag>
          <el-tag type="info" effect="light" size="small">空闲: {{ idleCount }}</el-tag>
          <el-tag type="warning" effect="light" size="small">暂停: {{ pausedCount }}</el-tag>
          <el-tag type="danger" effect="light" size="small">离线: {{ offlineCount }}</el-tag>
        </div>
      </div>
      <div class="header-right">
        <el-button type="primary" plain size="small" @click="refreshAll">
          <el-icon><refresh /></el-icon>
          刷新状态
        </el-button>
      </div>
    </div>

    <!-- 厂房网格布局 -->
    <div class="factory-grid-container">
      <div v-for="(row, rowIndex) in factoryRows" :key="rowIndex" class="factory-row">
        <div 
          v-for="(device, colIndex) in row.devices" 
          :key="device.id"
          class="device-card-wrapper"
          :class="{ 'has-aisle': colIndex === 7 }"
        >
          <!-- 设备微型卡片 -->
          <div 
            class="device-micro-card"
            :class="[`status-${device.status}`]"
            @mouseenter="device.showActions = true"
            @mouseleave="device.showActions = false"
          >
            <!-- 卡片头部：编号和状态灯 -->
            <div class="card-header">
              <span class="device-id">{{ device.id }}</span>
              <div class="status-indicator" :class="device.status"></div>
            </div>

            <!-- 核心数据区 -->
            <div class="card-body">
              <!-- 温度信息 -->
              <div class="temp-info">
                <div class="temp-item">
                  <el-icon :size="10" class="temp-icon"><hot-water /></el-icon>
                  <span class="temp-value">{{ device.nozzleTemp }}°</span>
                </div>
                <div class="temp-item">
                  <el-icon :size="10" class="temp-icon"><grid /></el-icon>
                  <span class="temp-value">{{ device.bedTemp }}°</span>
                </div>
              </div>

              <!-- 文件名（仅打印中显示） -->
              <div v-if="device.status === 'printing' && device.filename" class="filename" :title="device.filename">
                {{ device.filename }}
              </div>

              <!-- 进度条 -->
              <div v-if="device.status === 'printing'" class="progress-wrapper">
                <el-progress 
                  :percentage="device.progress" 
                  :stroke-width="3"
                  :show-text="false"
                  :color="getProgressColor(device.progress)"
                />
                <span class="progress-text">{{ device.progress }}%</span>
              </div>
            </div>

            <!-- 悬浮操作遮罩 -->
            <transition name="fade">
              <div v-show="device.showActions" class="hover-actions">
                <div class="actions-overlay">
                  <el-button 
                    v-if="device.status === 'printing'"
                    circle
                    size="small"
                    type="warning"
                    @click="pauseDevice(device)"
                  >
                    <el-icon><video-pause /></el-icon>
                  </el-button>
                  
                  <el-button 
                    v-if="device.status === 'paused'"
                    circle
                    size="small"
                    type="success"
                    @click="resumeDevice(device)"
                  >
                    <el-icon><video-play /></el-icon>
                  </el-button>
                  
                  <el-button 
                    v-if="['printing', 'paused'].includes(device.status)"
                    circle
                    size="small"
                    type="danger"
                    @click="stopDevice(device)"
                  >
                    <el-icon><circle-close /></el-icon>
                  </el-button>

                  <el-button 
                    v-if="device.status === 'offline'"
                    circle
                    size="small"
                    type="primary"
                    @click="reconnectDevice(device)"
                  >
                    <el-icon><refresh-right /></el-icon>
                  </el-button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  OfficeBuilding,
  Refresh,
  HotWater,
  Grid,
  VideoPause,
  VideoPlay,
  CircleClose,
  RefreshRight
} from '@element-plus/icons-vue'

defineOptions({ name: 'FarmDashboard' })

// 生成模拟数据
const generateMockData = () => {
  const rows = []
  const statusList = ['printing', 'idle', 'paused', 'offline']
  const statusWeights = [0.5, 0.25, 0.15, 0.1] // 打印中概率最高
  
  for (let row = 0; row < 4; row++) {
    const rowLabel = String.fromCharCode(65 + row) // A, B, C, D
    const devices = []
    
    for (let col = 1; col <= 13; col++) {
      const id = `#${rowLabel}-${col.toString().padStart(2, '0')}`
      
      // 根据权重随机选择状态
      const random = Math.random()
      let cumulativeWeight = 0
      let status = 'idle'
      
      for (let i = 0; i < statusList.length; i++) {
        cumulativeWeight += statusWeights[i]
        if (random <= cumulativeWeight) {
          status = statusList[i]
          break
        }
      }
      
      devices.push({
        id,
        status,
        nozzleTemp: status === 'offline' ? 0 : Math.floor(Math.random() * 100) + 150,
        bedTemp: status === 'offline' ? 0 : Math.floor(Math.random() * 30) + 50,
        progress: status === 'printing' ? Math.floor(Math.random() * 100) : 0,
        filename: status === 'printing' ? `Part_${Math.floor(Math.random() * 999)}.gcode` : '',
        showActions: false
      })
    }
    
    rows.push({
      rowLabel,
      devices
    })
  }
  
  return rows
}

const factoryRows = ref(generateMockData())

// 统计数量
const printingCount = computed(() => 
  factoryRows.value.reduce((sum, row) => 
    sum + row.devices.filter(d => d.status === 'printing').length, 0
  )
)

const idleCount = computed(() => 
  factoryRows.value.reduce((sum, row) => 
    sum + row.devices.filter(d => d.status === 'idle').length, 0
  )
)

const pausedCount = computed(() => 
  factoryRows.value.reduce((sum, row) => 
    sum + row.devices.filter(d => d.status === 'paused').length, 0
  )
)

const offlineCount = computed(() => 
  factoryRows.value.reduce((sum, row) => 
    sum + row.devices.filter(d => d.status === 'offline').length, 0
  )
)

// 获取进度条颜色
const getProgressColor = (progress) => {
  if (progress >= 90) return 'var(--el-color-success)'
  if (progress >= 50) return 'var(--el-color-primary)'
  return 'var(--el-color-warning)'
}

// 操作函数
const refreshAll = () => {
  factoryRows.value = generateMockData()
  ElMessage.success('状态已刷新')
}

const pauseDevice = (device) => {
  device.status = 'paused'
  ElMessage.info(`已暂停 ${device.id}`)
}

const resumeDevice = (device) => {
  device.status = 'printing'
  ElMessage.success(`已恢复 ${device.id}`)
}

const stopDevice = (device) => {
  device.status = 'idle'
  device.progress = 0
  device.filename = ''
  ElMessage.warning(`已停止 ${device.id}`)
}

const reconnectDevice = (device) => {
  device.status = 'idle'
  device.nozzleTemp = 25
  device.bedTemp = 25
  ElMessage.success(`${device.id} 已重新连接`)
}

onMounted(() => {
  // 模拟实时更新
  setInterval(() => {
    factoryRows.value.forEach(row => {
      row.devices.forEach(device => {
        if (device.status === 'printing' && device.progress < 100) {
          device.progress = Math.min(100, device.progress + Math.random() * 2)
          if (device.progress >= 100) {
            device.status = 'idle'
            device.filename = ''
          }
        }
      })
    })
  }, 5000)
})
</script>

<style scoped>
.factory-dashboard {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--ep-space-4);
}

/* ============================================
   Factory Header - 厂房标题栏
   ============================================ */
.factory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--ep-space-4) var(--ep-space-5);
  background: var(--ep-color-white);
  border-radius: var(--ep-border-radius-medium);
  box-shadow: var(--ep-box-shadow-light);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--ep-space-5);
}

.factory-title {
  display: flex;
  align-items: center;
  gap: var(--ep-space-2);
  margin: 0;
  font-size: var(--el-font-size-large);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.factory-stats {
  display: flex;
  gap: var(--ep-space-2);
}

/* ============================================
   Factory Grid - 厂房网格布局
   ============================================ */
.factory-grid-container {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  padding: var(--ep-space-2);
  background: var(--el-fill-color-lighter);
  border-radius: var(--ep-border-radius-medium);
}

.factory-row {
  display: flex;
  align-items: stretch;
  margin-bottom: var(--ep-space-3);
  min-width: max-content;
}

.device-card-wrapper {
  flex-shrink: 0;
  padding: var(--ep-space-1);
}

/* 关键过道设计 - 第8个卡片后增加间隔 */
.device-card-wrapper.has-aisle {
  margin-right: var(--ep-space-6);
  position: relative;
}

.device-card-wrapper.has-aisle::after {
  content: '';
  position: absolute;
  right: -24px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: repeating-linear-gradient(
    to bottom,
    var(--ep-color-gray-3) 0,
    var(--ep-color-gray-3) 4px,
    transparent 4px,
    transparent 8px
  );
  opacity: 0.5;
}

/* ============================================
   Device Micro Card - 紧凑型设备卡片
   ============================================ */
.device-micro-card {
  position: relative;
  width: 110px;
  min-height: 80px;
  padding: var(--ep-space-2);
  background: var(--el-bg-color-overlay);
  border-radius: var(--ep-border-radius-base);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  overflow: hidden;
}

.device-micro-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

/* 状态颜色语义化 */
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.printing {
  background-color: var(--el-color-success);
  box-shadow: 0 0 6px var(--el-color-success);
  animation: pulse 2s infinite;
}

.status-indicator.idle {
  background-color: var(--el-color-info);
}

.status-indicator.paused {
  background-color: var(--el-color-warning);
  animation: blink 1.5s infinite;
}

.status-indicator.offline {
  background-color: var(--el-color-danger);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--ep-space-2);
}

.device-id {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

/* 卡片主体 */
.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--ep-space-1);
}

/* 温度信息 */
.temp-info {
  display: flex;
  gap: var(--ep-space-2);
}

.temp-item {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: var(--el-text-color-secondary);
}

.temp-icon {
  color: var(--el-color-danger);
}

.temp-value {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

/* 文件名 */
.filename {
  font-size: 9px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* 进度条 */
.progress-wrapper {
  display: flex;
  align-items: center;
  gap: var(--ep-space-1);
  margin-top: 2px;
}

.progress-wrapper :deep(.el-progress) {
  flex: 1;
}

.progress-text {
  font-size: 9px;
  color: var(--el-text-color-secondary);
  min-width: 24px;
  text-align: right;
}

/* ============================================
   Hover Actions - 悬浮操作
   ============================================ */
.hover-actions {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ep-border-radius-base);
}

.actions-overlay {
  display: flex;
  gap: var(--ep-space-1);
  flex-wrap: wrap;
  justify-content: center;
  padding: var(--ep-space-1);
}

.actions-overlay :deep(.el-button) {
  padding: 4px;
  font-size: 12px;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ============================================
   Responsive - 响应式适配
   ============================================ */
@media (max-width: 1200px) {
  .device-micro-card {
    width: 100px;
    min-height: 75px;
  }
}

@media (max-width: 768px) {
  .factory-header {
    flex-direction: column;
    gap: var(--ep-space-3);
    align-items: flex-start;
  }
  
  .factory-stats {
    flex-wrap: wrap;
  }
}
</style>
