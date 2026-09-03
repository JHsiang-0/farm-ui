<template>
  <div class="dashboard-page">
    <header class="dashboard-heading">
      <div>
        <h1>概览仪表盘</h1>
        <p class="dashboard-heading__description">设备、任务与打印机状态一览</p>
      </div>
      <div class="dashboard-heading__actions">
        <t-button variant="outline" :loading="loading" @click="fetchOverview">
          <template #icon><RefreshIcon /></template>
          刷新数据
        </t-button>
        <t-button theme="primary" @click="goTo('/printers')">
          <template #icon><PrintIcon /></template>
          设备管理
        </t-button>
      </div>
    </header>

    <section class="stat-grid" aria-label="设备和任务统计">
      <t-card
        v-for="stat in statCards"
        :key="stat.key"
        bordered
        class="stat-card"
        :class="[`stat-card--${stat.tone}`, { 'stat-card--interactive': stat.to }]"
        :role="stat.to ? 'button' : undefined"
        :tabindex="stat.to ? 0 : undefined"
        :aria-label="stat.to ? `查看${stat.label}` : undefined"
        @click="stat.to && goTo(stat.to)"
        @keydown.enter.prevent="stat.to && goTo(stat.to)"
        @keydown.space.prevent="stat.to && goTo(stat.to)"
      >
        <div class="stat-card__topline">
          <span class="stat-card__label">{{ stat.label }}</span>
          <span class="stat-card__icon"><component :is="stat.icon" :size="22" /></span>
        </div>
        <div class="stat-card__value">{{ stat.value }}</div>
        <div class="stat-card__footer">
          <span>{{ stat.description }}</span>
          <ChevronRightIcon :size="16" />
        </div>
      </t-card>
    </section>

    <section class="dashboard-grid">
      <t-card bordered class="dashboard-card trend-card">
        <template #header>
          <div class="card-heading">
            <div>
              <h2>打印任务趋势</h2>
              <p>最近 7 天创建的打印任务数量</p>
            </div>
            <t-tag theme="primary" variant="light">任务统计</t-tag>
          </div>
        </template>

        <div class="trend-chart">
          <svg viewBox="0 0 640 230" role="img" aria-label="打印任务趋势图">
            <line
              v-for="line in chartGridLines"
              :key="line.y"
              x1="24"
              x2="616"
              :y1="line.y"
              :y2="line.y"
              class="chart-grid-line"
            />
            <polygon :points="chartAreaPoints" class="chart-area" />
            <polyline :points="chartPoints" class="chart-line" />
            <circle
              v-for="point in chartPointList"
              :key="point.label"
              :cx="point.x"
              :cy="point.y"
              r="4"
              class="chart-point"
            />
          </svg>
          <div class="chart-labels">
            <span v-for="item in trendData" :key="item.label">{{ item.label }}</span>
          </div>
        </div>
      </t-card>

      <t-card bordered class="dashboard-card status-card">
        <template #header>
          <div class="card-heading">
            <div>
              <h2>设备状态</h2>
              <p>当前打印机运行状态分布</p>
            </div>
          </div>
        </template>

        <div class="status-overview">
          <div class="status-donut" :style="donutStyle">
            <div class="status-donut__content">
              <strong>{{ totalPrinters }}</strong>
              <span>台设备</span>
            </div>
          </div>
          <div class="status-legend">
            <div v-for="item in statusSegments" :key="item.status" class="status-legend__item">
              <span class="status-legend__name">
                <i :style="{ backgroundColor: item.color }" />
                {{ item.label }}
              </span>
              <strong>{{ item.count }}</strong>
            </div>
          </div>
        </div>
      </t-card>
    </section>

    <section class="bottom-grid">
      <t-card bordered class="dashboard-card recent-card">
        <template #header>
          <div class="card-heading">
            <div>
              <h2>最近打印任务</h2>
              <p>查看最新任务和当前处理状态</p>
            </div>
            <t-button variant="text" @click="goTo('/tasks/history')">查看全部</t-button>
          </div>
        </template>

        <div v-if="recentJobs.length" class="job-list">
          <div v-for="job in recentJobs" :key="job.id" class="job-row">
            <div class="job-row__main">
              <span class="job-row__icon"><FileIcon :size="18" /></span>
              <div>
                <strong>{{ job.fileName || `任务 #${job.id}` }}</strong>
                <span>{{ formatJobTime(job.createdAt) }}</span>
              </div>
            </div>
            <t-tag :theme="getJobStatusType(job.status)" variant="light" size="small">
              {{ getJobStatusLabel(job.status) }}
            </t-tag>
          </div>
        </div>
        <t-empty v-else description="暂无打印任务" />
      </t-card>

      <t-card bordered class="dashboard-card alert-card">
        <template #header>
          <div class="card-heading">
            <div>
              <h2>设备提醒</h2>
              <p>需要关注的设备状态</p>
            </div>
            <t-button variant="text" @click="goTo('/printers')">设备列表</t-button>
          </div>
        </template>

        <div v-if="attentionPrinters.length" class="alert-list">
          <button
            v-for="printer in attentionPrinters"
            :key="printer.id"
            type="button"
            class="alert-row"
            @click="goTo('/printers')"
          >
            <span class="alert-row__icon"><ErrorCircleIcon :size="18" /></span>
            <span class="alert-row__content">
              <strong>{{ printer.name || `打印机 #${printer.id}` }}</strong>
              <span>{{ getPrinterStatusLabel(printer.status) }}</span>
            </span>
            <ChevronRightIcon :size="16" />
          </button>
        </div>
        <t-empty v-else description="设备运行正常" />
      </t-card>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronRightIcon,
  CheckCircleIcon,
  DashboardIcon,
  ErrorCircleIcon,
  FileIcon,
  PrintIcon,
  RefreshIcon
} from 'tdesign-icons-vue-next'
import { getPrinterList } from '@/api/printer'
import { getJobPage } from '@/api/job'

defineOptions({ name: 'DashboardView' })

const router = useRouter()
const loading = ref(false)
const printers = ref([])
const jobs = ref([])

const statusConfig = [
  { status: 'PRINTING', label: '打印中', color: '#0052d9' },
  { status: 'IDLE', label: '空闲', color: '#2ba471' },
  { status: 'PAUSED', label: '暂停', color: '#e37318' },
  { status: 'ERROR', label: '故障', color: '#d54941' },
  { status: 'OFFLINE', label: '离线', color: '#8f959e' }
]

const totalPrinters = computed(() => printers.value.length)
const printingPrinters = computed(() => printers.value.filter(item => item.status === 'PRINTING').length)
const idlePrinters = computed(() => printers.value.filter(item => item.status === 'IDLE').length)
const onlinePrinters = computed(() => printers.value.filter(item => item.status !== 'OFFLINE').length)
const attentionStatuses = ['ERROR', 'OFFLINE', 'PAUSED', 'UNKNOWN', 'FAULT', 'SYS_ERROR', 'PRINT_ERROR']
const isAttentionPrinter = printer => attentionStatuses.includes(String(printer.status || '').toUpperCase())
const attentionPrinterCount = computed(() => printers.value.filter(isAttentionPrinter).length)

const statCards = computed(() => [
  {
    key: 'printers',
    label: '打印机总数',
    value: totalPrinters.value,
    description: `${onlinePrinters.value} 台设备在线`,
    icon: DashboardIcon,
    tone: 'primary',
    to: '/printers'
  },
  {
    key: 'printing',
    label: '正在打印',
    value: printingPrinters.value,
    description: '实时打印中的设备',
    icon: PrintIcon,
    tone: 'blue',
    to: { path: '/printers', query: { status: 'PRINTING' } }
  },
  {
    key: 'idle',
    label: '空闲打印机',
    value: idlePrinters.value,
    description: '当前可分配任务的设备',
    icon: CheckCircleIcon,
    tone: 'orange',
    to: { path: '/printers', query: { status: 'IDLE' } }
  },
  {
    key: 'errors',
    label: '异常设备',
    value: attentionPrinterCount.value,
    description: attentionPrinterCount.value ? '请及时处理异常' : '当前运行正常',
    icon: ErrorCircleIcon,
    tone: attentionPrinterCount.value ? 'red' : 'green',
    to: { path: '/printers', query: { status: 'ATTENTION' } }
  }
])

const statusSegments = computed(() => {
  const total = totalPrinters.value
  return statusConfig.map(item => ({
    ...item,
    count: printers.value.filter(printer => printer.status === item.status).length,
    percent: total ? (printers.value.filter(printer => printer.status === item.status).length / total) * 100 : 0
  }))
})

const donutStyle = computed(() => {
  if (!totalPrinters.value) return { background: '#e7e7e7' }

  let start = 0
  const segments = statusSegments.value
    .filter(item => item.percent > 0)
    .map(item => {
      const end = start + item.percent
      const segment = `${item.color} ${start}% ${end}%`
      start = end
      return segment
    })

  return { background: `conic-gradient(${segments.join(', ')})` }
})

const trendData = computed(() => {
  const counts = new Map()
  jobs.value.forEach(job => {
    const date = job.createdAt?.slice(0, 10)
    if (date) counts.set(date, (counts.get(date) || 0) + 1)
  })

  const dates = [...counts.keys()].sort()
  const endDate = dates.length ? new Date(`${dates[dates.length - 1]}T00:00:00`) : new Date()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(endDate)
    date.setDate(endDate.getDate() - 6 + index)
    const isoDate = date.toISOString().slice(0, 10)
    return {
      label: isoDate.slice(5),
      value: counts.get(isoDate) || 0
    }
  })
})

const chartPointList = computed(() => {
  const width = 640
  const height = 230
  const paddingX = 24
  const paddingY = 24
  const max = Math.max(...trendData.value.map(item => item.value), 1)
  const step = (width - paddingX * 2) / (trendData.value.length - 1)

  return trendData.value.map((item, index) => ({
    label: item.label,
    x: paddingX + step * index,
    y: height - paddingY - (item.value / max) * (height - paddingY * 2)
  }))
})

const chartPoints = computed(() => chartPointList.value.map(point => `${point.x},${point.y}`).join(' '))
const chartAreaPoints = computed(() => {
  const points = chartPointList.value
  if (!points.length) return ''
  return `${points[0].x},206 ${chartPoints.value} ${points[points.length - 1].x},206`
})
const chartGridLines = [24, 70, 116, 162, 206].map(y => ({ y }))

const recentJobs = computed(() => [...jobs.value]
  .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  .slice(0, 5))

const attentionPrinters = computed(() => printers.value
  .filter(isAttentionPrinter)
  .slice(0, 5))

const fetchOverview = async () => {
  loading.value = true
  const [printerResult, jobResult] = await Promise.allSettled([
    getPrinterList({ pageNum: 1, pageSize: 100 }),
    getJobPage({ pageNum: 1, pageSize: 100 })
  ])

  if (printerResult.status === 'fulfilled') {
    printers.value = printerResult.value.data?.records || []
  }
  if (jobResult.status === 'fulfilled') {
    jobs.value = jobResult.value.data?.records || []
  }
  loading.value = false
}

const goTo = path => {
  router.push(path)
}

const getJobStatusLabel = status => ({
  QUEUED: '排队中',
  ASSIGNED: '已分配',
  READY: '待启动',
  PRINTING: '打印中',
  PAUSED: '已暂停',
  COMPLETED: '已完成',
  FAILED: '失败',
  CANCELLED: '已取消'
}[status] || status || '未知')

const getJobStatusType = status => ({
  QUEUED: 'primary',
  ASSIGNED: 'warning',
  READY: 'warning',
  PRINTING: 'success',
  PAUSED: 'warning',
  FAILED: 'danger',
  CANCELLED: 'default',
  COMPLETED: 'default'
}[status] || 'default')

const getPrinterStatusLabel = status => ({
  ERROR: '设备报告异常，请检查打印机',
  OFFLINE: '设备当前处于离线状态',
  PAUSED: '设备已暂停打印'
}[status] || '设备需要关注')

const formatJobTime = value => value ? String(value).replace('T', ' ').slice(0, 16) : '时间未知'

onMounted(fetchOverview)
</script>

<style scoped>
.dashboard-page {
  min-width: 0;
  padding-bottom: 1.5rem;
}

.dashboard-heading,
.card-heading,
.stat-card__topline,
.stat-card__footer,
.job-row,
.job-row__main,
.alert-row {
  display: flex;
  align-items: center;
}

.dashboard-heading,
.card-heading,
.stat-card__topline,
.stat-card__footer {
  justify-content: space-between;
}

.dashboard-heading {
  gap: 1rem;
  margin-bottom: 1rem;
}

.dashboard-heading h1,
.card-heading h2,
.card-heading p,
.dashboard-heading p {
  margin: 0;
}

.dashboard-heading h1 {
  color: var(--app-text-primary);
  font-size: 1.5rem;
  line-height: 1.35;
}

.dashboard-heading__description,
.card-heading p {
  margin-top: 0.25rem !important;
  color: var(--app-text-secondary);
  font-size: 0.8125rem;
}

.dashboard-heading__actions {
  display: flex;
  gap: 0.75rem;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-card,
.dashboard-card {
  background: var(--app-surface);
  border-color: var(--app-border);
  border-radius: 8px;
}

.stat-card {
  min-width: 0;
}

.stat-card--interactive {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card--interactive:hover {
  box-shadow: 0 8px 20px rgb(0 0 0 / 8%);
  transform: translateY(-2px);
}

.stat-card--interactive:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}

.stat-card :deep(.t-card__body) {
  padding: 1.25rem;
}

.stat-card__label {
  color: var(--app-text-secondary);
  font-size: 0.8125rem;
}

.stat-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: var(--app-primary);
  background: #e8f3ff;
  border-radius: 50%;
}

.stat-card__value {
  margin: 0.75rem 0 0.625rem;
  color: var(--app-text-primary);
  font-size: 2rem;
  font-weight: 600;
  line-height: 1;
}

.stat-card__footer {
  color: var(--app-text-secondary);
  font-size: 0.75rem;
}

.stat-card--primary {
  color: #fff;
  background: var(--app-primary);
  border-color: var(--app-primary);
}

.stat-card--primary .stat-card__label,
.stat-card--primary .stat-card__value,
.stat-card--primary .stat-card__footer {
  color: #fff;
}

.stat-card--primary .stat-card__icon {
  color: #fff;
  background: rgb(255 255 255 / 18%);
}

.stat-card--blue .stat-card__icon {
  color: #0052d9;
}

.stat-card--orange .stat-card__icon {
  color: #e37318;
  background: #fff1e9;
}

.stat-card--green .stat-card__icon {
  color: #2ba471;
  background: #e8f8f2;
}

.stat-card--red .stat-card__icon {
  color: #d54941;
  background: #fff0ed;
}

.dashboard-grid,
.bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.bottom-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 0;
}

.dashboard-card :deep(.t-card__header) {
  padding: 1.25rem 1.5rem 0;
  border-bottom: 0;
}

.dashboard-card :deep(.t-card__body) {
  padding: 1.25rem 1.5rem 1.5rem;
}

.card-heading h2 {
  color: var(--app-text-primary);
  font-size: 1rem;
  font-weight: 600;
}

.trend-chart {
  width: 100%;
  padding-top: 0.5rem;
}

.trend-chart svg {
  display: block;
  width: 100%;
  height: 230px;
  overflow: visible;
}

.chart-grid-line {
  stroke: #e7e7e7;
  stroke-width: 1;
}

.chart-area {
  fill: rgb(0 82 217 / 10%);
}

.chart-line {
  fill: none;
  stroke: #0052d9;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 3;
}

.chart-point {
  fill: #fff;
  stroke: #0052d9;
  stroke-width: 3;
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 0.5rem;
  color: var(--app-text-placeholder);
  font-size: 0.6875rem;
}

.status-overview {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 1.5rem;
  min-height: 250px;
}

.status-donut {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 176px;
  height: 176px;
  padding: 18px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-donut::before {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--app-surface);
  border-radius: 50%;
  content: '';
}

.status-donut__content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--app-text-secondary);
}

.status-donut__content strong {
  color: var(--app-text-primary);
  font-size: 1.75rem;
  line-height: 1.2;
}

.status-donut__content span {
  font-size: 0.75rem;
}

.status-legend {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  min-width: 110px;
}

.status-legend__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: var(--app-text-secondary);
  font-size: 0.8125rem;
}

.status-legend__name {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.status-legend__name i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-legend__item strong {
  color: var(--app-text-primary);
}

.job-list,
.alert-list {
  display: flex;
  flex-direction: column;
}

.job-row,
.alert-row {
  justify-content: space-between;
  gap: 1rem;
  min-height: 58px;
  padding: 0.625rem 0;
  border-bottom: 1px solid var(--app-border);
}

.job-row:last-child,
.alert-row:last-child {
  border-bottom: 0;
}

.job-row__main {
  min-width: 0;
  gap: 0.75rem;
}

.job-row__icon,
.alert-row__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--app-primary);
  background: #e8f3ff;
  border-radius: 50%;
  flex-shrink: 0;
}

.job-row__main > div,
.alert-row__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.25rem;
}

.job-row strong,
.alert-row strong {
  overflow: hidden;
  color: var(--app-text-primary);
  font-size: 0.8125rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-row span,
.alert-row span {
  color: var(--app-text-secondary);
  font-size: 0.75rem;
}

.alert-row {
  width: 100%;
  color: var(--app-text-secondary);
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.alert-row:hover {
  background: var(--app-surface-muted);
}

.alert-row__icon {
  color: var(--app-danger);
  background: #fff0ed;
}

.alert-row__content {
  flex: 1;
}

@media (max-width: 1100px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .dashboard-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .dashboard-heading__actions {
    width: 100%;
  }

  .dashboard-heading__actions .t-button {
    flex: 1;
  }

  .stat-grid {
    grid-template-columns: 1fr;
  }

  .status-overview {
    flex-direction: column;
    padding: 0.5rem 0;
  }
}
</style>
