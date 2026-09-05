import { cloneMockData, mockState, nextMockId, resetMockState } from './data'

const MOCK_DELAY = 120
const ATTENTION_PRINTER_STATUSES = ['ERROR', 'OFFLINE', 'PAUSED', 'UNKNOWN', 'FAULT', 'SYS_ERROR', 'PRINT_ERROR']

const wait = duration => new Promise(resolve => setTimeout(resolve, duration))

const now = () => new Date().toISOString().slice(0, 19)

const success = data => ({
  code: 200,
  message: '操作成功',
  data,
  timestamp: Date.now()
})

export class MockRequestError extends Error {
  constructor(status, code, message, data = null) {
    super(message)
    this.name = 'MockRequestError'
    this.response = {
      status,
      data: {
        code,
        message,
        data,
        timestamp: Date.now()
      }
    }
  }
}

const fail = (status, code, message, data) => {
  throw new MockRequestError(status, code, message, data)
}

const getBody = config => {
  if (config.data instanceof FormData) {
    return {
      file: config.data.get('file'),
      parentId: config.data.get('parentId')
    }
  }
  return config.data || {}
}

const getHeader = (headers, name) => {
  if (!headers) return ''
  return headers[name] || headers[name.toLowerCase()] || ''
}

const getMockErrorScenario = config => {
  const value = config.params?.mockError || getHeader(config.headers, 'X-Mock-Error')
  return String(value || '').trim()
}

const throwMockErrorScenario = config => {
  const scenario = getMockErrorScenario(config)
  const scenarios = {
    '401': [401, 401, '模拟未登录'],
    '403': [403, 403, '模拟无权限'],
    '404': [404, 404, '模拟资源不存在'],
    '409': [409, 409, '模拟资源冲突'],
    '422': [422, 422, '模拟业务校验失败'],
    '10001': [400, 10001, '模拟参数错误'],
    '10002': [409, 10002, '模拟设备忙碌'],
    '5003': [500, 5003, '模拟设备执行失败'],
    '5004': [503, 5004, '模拟服务维护中']
  }
  if (scenarios[scenario]) fail(...scenarios[scenario])
}

const getSession = config => {
  const authorization = getHeader(config.headers, 'Authorization')
  const token = authorization.replace(/^Bearer\s+/i, '')
  return token ? mockState.sessions[token] : null
}

const requireSession = (config, roles = []) => {
  const session = getSession(config)
  if (!session) {
    fail(401, 401, '未登录或登录已过期')
  }
  if (roles.length > 0 && !roles.includes(session.role)) {
    fail(403, 403, '没有权限执行此操作')
  }
  return session
}

const getPath = url => {
  try {
    return new URL(url, 'http://mock.local').pathname
  } catch {
    return url.split('?')[0]
  }
}

const getParams = config => config.params || {}

const getPage = (params = {}) => {
  const pageNum = Math.max(Number(params.pageNum) || 1, 1)
  const pageSize = Math.min(Math.max(Number(params.pageSize) || 10, 1), 100)
  return { pageNum, pageSize }
}

const getPageData = (records, params) => {
  const { pageNum, pageSize } = getPage(params)
  const start = (pageNum - 1) * pageSize
  const pages = Math.ceil(records.length / pageSize)
  return {
    records: records.slice(start, start + pageSize),
    total: records.length,
    pageNum,
    pageSize,
    pages
  }
}

const findPrinter = id => mockState.printers.find(item => String(item.id) === String(id))
const findFile = id => mockState.files.find(item => String(item.id) === String(id))
const findJob = id => mockState.jobs.find(item => String(item.id) === String(id))

const canReadResource = (session, userId) => session.role === 'ADMIN' || String(session.userId) === String(userId)

const publicFile = file => {
  const data = cloneMockData(file)
  delete data.safeName
  return data
}

const publicJob = job => {
  const file = findFile(job.fileId)
  const printer = job.printerId ? findPrinter(job.printerId) : null
  return {
    ...cloneMockData(job),
    fileName: file?.originalName || `文件 #${job.fileId}`,
    printerName: printer?.name || null,
    materialType: file?.materialType || null,
    nozzleSize: file?.nozzleSize || null,
    endedAt: job.completedAt
  }
}

const publicUser = user => {
  const data = cloneMockData(user)
  delete data.password
  return data
}

const makeMockFileUrl = name => {
  const content = `; Mock G-code: ${name}\nG28\nG1 X10 Y10 F3000\nM104 S0\n`
  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`
}

const handleLogin = config => {
  const { username, password } = getBody(config)
  if (username === 'disabled') {
    fail(403, 403, '用户已被禁用')
  }

  const user = mockState.users.find(item => item.username === username)
  if (!user || user.password !== password) {
    fail(401, 401, '用户名或密码错误')
  }
  if (!user.enabled) {
    fail(403, 403, '用户已被禁用')
  }

  const token = `mock-token-${user.id}`
  mockState.sessions[token] = {
    userId: user.id,
    username: user.username,
    role: user.role
  }

  return {
    token,
    expiresIn: 604800,
    userId: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    phone: user.phone
  }
}

const handleFirstAdminSetupStatus = () => ({
  initialized: mockState.users.length > 0,
  setupAvailable: mockState.users.length === 0
})

const handleFirstAdminSetup = config => {
  if (mockState.users.length > 0) {
    fail(409, 409, '系统已完成初始化，请登录后由管理员创建账号')
  }

  const body = getBody(config)
  if (!body.username || !body.password || body.password !== body.confirmPassword) {
    fail(400, 400, '用户名、密码和确认密码不能为空且必须一致')
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,20}$/.test(body.password)) {
    fail(400, 400, '密码必须为 6-20 位且包含大小写字母和数字')
  }

  const user = {
    id: nextMockId('users'),
    username: body.username,
    password: body.password,
    role: 'ADMIN',
    email: body.email || null,
    phone: body.phone || null,
    enabled: true,
    createdAt: now(),
    updatedAt: now()
  }
  mockState.users.push(user)
  const token = `mock-token-${user.id}`
  mockState.sessions[token] = { userId: user.id, username: user.username, role: user.role }
  return {
    token,
    expiresIn: 604800,
    userId: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    phone: user.phone
  }
}

const handleRegister = config => {
  requireSession(config, ['ADMIN'])
  const body = getBody(config)
  if (!body.username || !body.password) fail(400, 400, '用户名和密码不能为空')
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,20}$/.test(body.password)) {
    fail(400, 400, '密码必须为 6-20 位且包含大小写字母和数字')
  }
  if (mockState.users.some(item => item.username === body.username)) {
    fail(409, 409, '用户名已存在')
  }

  const user = {
    id: mockState.users.length + 1,
    username: body.username,
    password: body.password,
    role: 'OPERATOR',
    email: body.email || null,
    phone: body.phone || null,
    enabled: true,
    createdAt: now(),
    updatedAt: now()
  }
  mockState.users.push(user)
  return user.id
}

const handleAdminUserPage = config => {
  requireSession(config, ['ADMIN'])
  const params = getParams(config)
  let records = mockState.users
  if (params.username) records = records.filter(user => user.username.includes(String(params.username)))
  if (params.role) records = records.filter(user => user.role === params.role)
  if (params.email) records = records.filter(user => (user.email || '').includes(String(params.email)))
  return getPageData(records.map(publicUser), params)
}

const handleAdminUserCreate = config => {
  const id = handleRegister(config)
  const user = mockState.users.find(item => item.id === id)
  const role = getBody(config).role
  if (user && ['ADMIN', 'OPERATOR'].includes(role)) user.role = role
  return id
}

const handleAdminUserUpdate = config => {
  const session = requireSession(config, ['ADMIN'])
  const id = getPath(config.url).split('/').at(-1)
  const user = mockState.users.find(item => String(item.id) === String(id))
  if (!user) fail(404, 404, '鐢ㄦ埛涓嶅瓨鍦?')
  const body = getBody(config)
  if (body.email !== undefined) user.email = body.email || null
  if (body.phone !== undefined) user.phone = body.phone || null
  if (body.role && ['ADMIN', 'OPERATOR'].includes(body.role)) user.role = body.role
  if (body.password) user.password = body.password
  user.updatedAt = now()
  if (session.userId === user.id && body.role) session.role = body.role
  return null
}

const handleAdminUserToggle = config => {
  requireSession(config, ['ADMIN'])
  const parts = getPath(config.url).split('/')
  const id = parts.at(-2)
  const user = mockState.users.find(item => String(item.id) === String(id))
  if (!user) fail(404, 404, '鐢ㄦ埛涓嶅瓨鍦?')
  user.enabled = parts.at(-1) === 'enable'
  user.updatedAt = now()
  return null
}

const handleProfile = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const id = getPath(config.url).split('/').at(-2)
  if (String(session.userId) !== String(id)) fail(403, 403, '鍙兘鏌ョ湅鑷繁鐨勮祫鏂?')
  const user = mockState.users.find(item => item.id === session.userId)
  if (!user) fail(404, 404, '鐢ㄦ埛涓嶅瓨鍦?')
  if (config.method?.toLowerCase() === 'put') {
    const body = getBody(config)
    user.email = body.email ?? user.email
    user.phone = body.phone ?? user.phone
    user.updatedAt = now()
  }
  return publicUser(user)
}

const handleChangePassword = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const id = getPath(config.url).split('/').at(-2)
  if (String(session.userId) !== String(id)) fail(403, 403, '鍙兘淇敼鑷繁鐨勫瘑鐮?')
  const body = getBody(config)
  const user = mockState.users.find(item => item.id === session.userId)
  if (!user || user.password !== body.oldPassword) fail(422, 422, '鏃у瘑鐮侀敊璇?')
  if (!body.newPassword || body.newPassword !== body.confirmPassword || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,20}$/.test(body.newPassword)) {
    fail(422, 422, '鏂板瘑鐮佹牸寮忔垨纭涓嶆纭?')
  }
  user.password = body.newPassword
  user.updatedAt = now()
  return null
}

const handlePrinterPage = config => {
  requireSession(config, ['ADMIN', 'OPERATOR'])
  const params = getParams(config)
  let records = mockState.printers
  const keyword = String(params.keyword || params.name || '').trim().toLowerCase()
  if (keyword) {
    records = records.filter(item => [
      item.name,
      item.ipAddress,
      item.macAddress,
      item.machineNumber
    ].some(value => String(value || '').toLowerCase().includes(keyword)))
  }
  if (params.status) {
    records = String(params.status).toUpperCase() === 'ATTENTION'
      ? records.filter(item => ATTENTION_PRINTER_STATUSES.includes(String(item.status || '').toUpperCase()))
      : records.filter(item => String(item.status || '').toUpperCase() === String(params.status).toUpperCase())
  }
  if (params.firmwareType) {
    records = records.filter(item => String(item.firmwareType || '').toUpperCase() === String(params.firmwareType).toUpperCase())
  }
  if (params.zone) {
    records = records.filter(item => item.zone === params.zone)
  }
  return getPageData(records.map(cloneMockData), params)
}

const handleAddPrinter = config => {
  requireSession(config, ['ADMIN'])
  const body = getBody(config)
  const printer = {
    id: nextMockId('printer'),
    name: body.name || `Mock_Printer_${Date.now()}`,
    ipAddress: body.ipAddress || '192.168.1.100',
    macAddress: body.macAddress || 'AA:BB:CC:DD:EE:99',
    firmwareType: body.firmwareType || 'KLIPPER',
    status: 'IDLE',
    isSafeToPrint: false,
    currentJobId: null,
    currentMaterial: body.currentMaterial || 'PLA',
    nozzleSize: Number(body.nozzleSize) || 0.4,
    gridRow: body.gridRow ?? null,
    gridCol: body.gridCol ?? null,
    createdAt: now(),
    updatedAt: now()
  }
  mockState.printers.push(printer)
  return null
}

const handleUpdatePrinter = config => {
  requireSession(config, ['ADMIN'])
  const body = getBody(config)
  const printer = findPrinter(body.id)
  if (!printer) fail(404, 404, '打印机不存在')
  Object.assign(printer, body, { updatedAt: now() })
  return null
}

const handleDeletePrinter = config => {
  requireSession(config, ['ADMIN'])
  const id = getPath(config.url).split('/').pop()
  const index = mockState.printers.findIndex(item => String(item.id) === String(id))
  if (index === -1) fail(404, 404, '打印机不存在')
  mockState.printers.splice(index, 1)
  return null
}

const handleScanPrinters = config => {
  requireSession(config, ['ADMIN'])
  const subnet = getParams(config).subnet || '192.168.1'
  return [
    {
      ipAddress: `${subnet}.90`,
      macAddress: 'AA:BB:CC:DD:EE:90',
      isNewDevice: true,
      status: 'IDLE',
      suggestedName: 'Mock_Scanned_Printer'
    }
  ]
}

const handleBatchAddPrinters = config => {
  requireSession(config, ['ADMIN'])
  const devices = Array.isArray(config.data) ? config.data : []
  const items = devices.map(device => {
    const existing = mockState.printers.find(item => item.ipAddress === device.ipAddress)
    if (existing) {
      Object.assign(existing, device, { updatedAt: now() })
      return existing
    }

    const printer = {
      id: nextMockId('printer'),
      name: device.name || `Mock_Printer_${Date.now()}`,
      ipAddress: device.ipAddress,
      macAddress: device.macAddress,
      firmwareType: device.firmwareType || 'KLIPPER',
      status: 'IDLE',
      isSafeToPrint: false,
      currentJobId: null,
      currentMaterial: 'PLA',
      nozzleSize: 0.4,
      gridRow: null,
      gridCol: null,
      createdAt: now(),
      updatedAt: now()
    }
    mockState.printers.push(printer)
    return printer
  })
  return {
    successCount: items.length,
    failedCount: 0,
    items: items.map(cloneMockData)
  }
}

const handleUnallocatedPrinters = config => {
  requireSession(config, ['ADMIN', 'OPERATOR'])
  const keyword = getParams(config).keyword
  return mockState.printers
    .filter(item => item.gridRow == null)
    .filter(item => !keyword || item.name.toLowerCase().includes(String(keyword).toLowerCase()))
    .map(cloneMockData)
}

const handlePositions = config => {
  requireSession(config, ['ADMIN'])
  const positions = Array.isArray(config.data) ? config.data : []
  positions.forEach(position => {
    const printer = findPrinter(position.id)
    if (printer) {
      printer.gridRow = position.gridRow ?? null
      printer.gridCol = position.gridCol ?? null
      printer.updatedAt = now()
    }
  })
  return null
}

const handleFilePage = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const params = getBody(config)
  const parentId = params.parentId == null || params.parentId === '' ? null : Number(params.parentId)
  let records = mockState.files.filter(item => item.parentId === parentId)
  if (session.role !== 'ADMIN') {
    records = records.filter(item => canReadResource(session, item.userId))
  }
  const fileName = params.fileName || params.keyword
  if (fileName) {
    records = records.filter(item => item.originalName.toLowerCase().includes(String(fileName).trim().toLowerCase()))
  }
  if (params.materialType) {
    records = records.filter(item => item.materialType === params.materialType)
  }
  records.sort((a, b) => {
    if (a.folder !== b.folder) return a.folder ? -1 : 1

    const createdAtDiff = new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    if (createdAtDiff !== 0) return createdAtDiff

    return String(b.id).localeCompare(String(a.id), undefined, { numeric: true })
  })
  return getPageData(records.map(publicFile), params)
}

const handleUpload = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const body = getBody(config)
  const file = body.file
  if (!file?.name) fail(400, 400, '请选择要上传的文件')
  if (!/\.(gcode|bgcode)$/i.test(file.name)) fail(400, 400, '仅支持 .gcode 或 .bgcode 文件')

  const createdAt = now()
  const printFile = {
    id: nextMockId('file'),
    parentId: body.parentId == null || body.parentId === '' ? null : Number(body.parentId),
    folder: false,
    isFolder: 0,
    originalName: file.name,
    safeName: file.name,
    fileSize: file.size || 1024,
    fileUrl: makeMockFileUrl(file.name),
    userId: session.userId,
    createdAt,
    estTime: 1800,
    estimatedSeconds: 1800,
    materialType: 'PLA',
    nozzleSize: 0.4,
    filamentWeight: 8,
    filamentLength: 1800,
    nozzleTemp: 210,
    bedTemp: 60,
    layerHeight: 0.2,
    firstLayerHeight: 0.24,
    firstLayerNozzleTemp: 215,
    firstLayerBedTemp: 60,
    printCount: 0,
    successRate: 0
  }
  mockState.files.push(printFile)
  return publicFile(printFile)
}

const handleCreateFolder = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const body = getBody(config)
  if (!body.folderName?.trim()) fail(400, 400, '文件夹名称不能为空')
  const folder = {
    id: nextMockId('folder'),
    parentId: body.parentId == null ? null : Number(body.parentId),
    folder: true,
    isFolder: 1,
    originalName: body.folderName.trim(),
    safeName: body.folderName.trim(),
    fileSize: 0,
    fileUrl: null,
    userId: session.userId,
    createdAt: now(),
    estTime: 0,
    estimatedSeconds: 0,
    materialType: null,
    nozzleSize: null,
    filamentWeight: null,
    filamentLength: null,
    nozzleTemp: null,
    bedTemp: null,
    layerHeight: null,
    printCount: 0,
    successRate: 0
  }
  mockState.files.push(folder)
  return publicFile(folder)
}

const getFileForSession = (config, id) => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const file = findFile(id)
  if (!file) fail(404, 404, '文件不存在')
  if (!canReadResource(session, file.userId)) fail(403, 403, '无权访问此文件')
  return file
}

const handleDownload = config => {
  const id = getPath(config.url).split('/').at(-2)
  const file = getFileForSession(config, id)
  if (file.folder) fail(422, 422, '文件夹不能下载')
  return file.fileUrl
}

const handleDeleteFile = config => {
  const id = getPath(config.url).split('/').pop()
  const file = getFileForSession(config, id)
  mockState.files.splice(mockState.files.indexOf(file), 1)
  return null
}

const handleBatchDeleteFiles = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const ids = getBody(config).ids || []
  ids.forEach(id => {
    const file = findFile(id)
    if (file && canReadResource(session, file.userId)) {
      mockState.files.splice(mockState.files.indexOf(file), 1)
    }
  })
  return null
}

const handleJobPage = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const params = getBody(config)
  let records = mockState.jobs
  if (session.role !== 'ADMIN') {
    records = records.filter(item => String(item.userId) === String(session.userId))
  }
  if (params.status) records = records.filter(item => item.status === params.status)
  if (params.printerId) records = records.filter(item => String(item.printerId) === String(params.printerId))
  return getPageData(records.map(publicJob), params)
}

const handleJobQueue = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  let records = mockState.jobs.filter(item => ['QUEUED', 'ASSIGNED', 'READY', 'PAUSED'].includes(item.status))
  if (session.role !== 'ADMIN') {
    records = records.filter(item => String(item.userId) === String(session.userId))
  }
  return records
    .sort((a, b) => b.priority - a.priority || new Date(b.createdAt) - new Date(a.createdAt))
    .map(publicJob)
}

const handleCreateJob = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const body = getBody(config)
  const file = findFile(body.fileId)
  if (!file || file.folder) fail(404, 404, '打印文件不存在')
  if (!canReadResource(session, file.userId)) fail(403, 403, '无权使用此文件创建任务')
  const createdAt = now()
  const job = {
    id: nextMockId('job'),
    fileId: Number(body.fileId),
    printerId: body.printerId ? Number(body.printerId) : null,
    userId: session.userId,
    operatorId: null,
    priority: Number(body.priority) || 0,
    status: 'QUEUED',
    progress: 0,
    startedAt: null,
    completedAt: null,
    errorReason: null,
    createdAt,
    updatedAt: createdAt
  }
  mockState.jobs.push(job)
  return { id: job.id }
}

const handleCancelJob = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const id = getPath(config.url).split('/').pop()
  const job = findJob(id)
  if (!job) fail(404, 404, '任务不存在')
  if (!canReadResource(session, job.userId)) fail(403, 403, '无权操作此任务')
  if (!['QUEUED', 'ASSIGNED', 'READY', 'PAUSED'].includes(job.status)) {
    fail(422, 422, '当前任务状态不允许取消')
  }
  job.status = 'CANCELLED'
  job.updatedAt = now()
  if (job.printerId) {
    const printer = findPrinter(job.printerId)
    if (printer?.currentJobId === job.id) {
      printer.currentJobId = null
      printer.status = 'IDLE'
      printer.updatedAt = now()
    }
  }
  return null
}

const handleAssignJob = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const body = getBody(config)
  const job = findJob(body.jobId)
  const printer = findPrinter(body.printerId)
  if (!job) fail(404, 404, '任务不存在')
  if (!printer) fail(404, 404, '打印机不存在')
  if (!canReadResource(session, job.userId)) fail(403, 403, '无权操作此任务')
  if (job.status !== 'QUEUED') fail(422, 422, '当前任务状态不允许派发')
  if (printer.status !== 'IDLE' || printer.currentJobId) fail(409, 10002, '打印机当前忙碌')
  job.printerId = printer.id
  job.status = 'ASSIGNED'
  job.updatedAt = now()
  printer.currentJobId = job.id
  printer.status = 'IDLE'
  printer.updatedAt = now()
  return publicJob(job)
}

const handleConfirmSafe = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const printer = findPrinter(getBody(config).printerId)
  if (!printer) fail(404, 404, '打印机不存在')
  if (session.role !== 'ADMIN' && !printer.currentJobId) fail(422, 422, '打印机没有待确认任务')
  printer.isSafeToPrint = true
  printer.updatedAt = now()
  return cloneMockData(printer)
}

const handleStartJob = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const body = getBody(config)
  const job = findJob(body.jobId)
  if (!job) fail(404, 404, '任务不存在')
  if (!canReadResource(session, job.userId)) fail(403, 403, '无权操作此任务')
  const printer = findPrinter(job.printerId)
  if (!printer) fail(422, 422, '任务尚未分配打印机')
  if (!printer.isSafeToPrint) fail(422, 422, '请先完成设备安全确认')
  if (!['ASSIGNED', 'READY'].includes(job.status)) fail(422, 422, '当前任务状态不允许启动')
  job.status = body.action === 'UPLOAD_ONLY' ? 'READY' : 'PRINTING'
  job.operatorId = session.userId
  job.startedAt = job.startedAt || now()
  job.updatedAt = now()
  printer.status = job.status === 'PRINTING' ? 'PRINTING' : 'IDLE'
  printer.isSafeToPrint = false
  printer.updatedAt = now()
  return publicJob(job)
}

const handlePrinterControl = config => {
  const session = requireSession(config, ['ADMIN', 'OPERATOR'])
  const pathParts = getPath(config.url).split('/')
  const printer = findPrinter(pathParts.at(-2))
  if (!printer) fail(404, 404, '打印机不存在')
  if (!printer.currentJobId) fail(422, 422, '打印机当前没有任务')
  const job = findJob(printer.currentJobId)
  if (pathParts.at(-1) === 'pause') {
    if (job) job.status = 'PAUSED'
    printer.status = 'PAUSED'
  } else {
    if (job) {
      if (!canReadResource(session, job.userId)) fail(403, 403, '无权操作此任务')
      job.status = 'CANCELLED'
      job.updatedAt = now()
    }
    printer.status = 'IDLE'
    printer.currentJobId = null
    printer.isSafeToPrint = false
  }
  printer.updatedAt = now()
  return null
}

const route = async config => {
  throwMockErrorScenario(config)
  const method = String(config.method || 'get').toUpperCase()
  const path = getPath(config.url)
  const key = `${method} ${path}`

  if (key === 'POST /api/v1/auth/login') return handleLogin(config)
  if (key === 'GET /api/v1/auth/setup/status') return handleFirstAdminSetupStatus()
  if (key === 'POST /api/v1/auth/setup/admin') return handleFirstAdminSetup(config)
  if (key === 'POST /api/v1/auth/register') return handleRegister(config)
  if (key === 'GET /api/v1/auth/admin/users') return handleAdminUserPage(config)
  if (key === 'POST /api/v1/auth/admin/users') return handleAdminUserCreate(config)
  if (/^PUT \/api\/v1\/auth\/admin\/users\/[^/]+$/.test(key)) return handleAdminUserUpdate(config)
  if (/^POST \/api\/v1\/auth\/admin\/users\/[^/]+\/(enable|disable)$/.test(key)) return handleAdminUserToggle(config)
  if (/^(GET|PUT) \/api\/v1\/auth\/[^/]+\/profile$/.test(key)) return handleProfile(config)
  if (/^POST \/api\/v1\/auth\/[^/]+\/change-password$/.test(key)) return handleChangePassword(config)
  if (key === 'GET /api/v1/printers/page') return handlePrinterPage(config)
  if (key === 'POST /api/v1/printers/add') return handleAddPrinter(config)
  if (key === 'PUT /api/v1/printers/update') return handleUpdatePrinter(config)
  if (key === 'GET /api/v1/printers/scan') return handleScanPrinters(config)
  if (key === 'POST /api/v1/printers/batch-add') return handleBatchAddPrinters(config)
  if (key === 'GET /api/v1/printers/unallocated') return handleUnallocatedPrinters(config)
  if (key === 'PUT /api/v1/printers/positions') return handlePositions(config)
  if (key === 'POST /api/v1/print-files/page') return handleFilePage(config)
  if (key === 'POST /api/v1/print-files/upload') return handleUpload(config)
  if (key === 'POST /api/v1/print-files/folder/create') return handleCreateFolder(config)
  if (key === 'DELETE /api/v1/print-files/batch') return handleBatchDeleteFiles(config)
  if (key === 'GET /api/v1/print-jobs/queue') return handleJobQueue(config)
  if (key === 'POST /api/v1/print-jobs/page') return handleJobPage(config)
  if (key === 'POST /api/v1/print-jobs/create' || key === 'POST /api/v1/print-jobs') return handleCreateJob(config)
  if (key === 'POST /api/v1/print-jobs/safe/assign') return handleAssignJob(config)
  if (key === 'POST /api/v1/print-jobs/safe/confirm') return handleConfirmSafe(config)
  if (key === 'POST /api/v1/print-jobs/safe/start') return handleStartJob(config)
  if (/^POST \/api\/v1\/control\/\d+\/(pause|emergency-stop)$/.test(key)) return handlePrinterControl(config)
  if (/^DELETE \/api\/v1\/printers\/delete\/[^/]+$/.test(key)) return handleDeletePrinter(config)
  if (/^GET \/api\/v1\/print-files\/[^/]+\/download$/.test(key)) return handleDownload(config)
  if (/^DELETE \/api\/v1\/print-files\/[^/]+$/.test(key)) return handleDeleteFile(config)
  if (/^DELETE \/api\/v1\/print-jobs\/[^/]+$/.test(key)) return handleCancelJob(config)

  fail(404, 404, `Mock 未实现接口：${method} ${path}`)
}

export const isMockEnabled = import.meta.env.VITE_USE_MOCK === 'true'
  || import.meta.env.MODE === 'mock'
  || import.meta.env.MODE === 'desktop-mock'

if (import.meta.env.DEV) {
  window.__FARM_RESET_MOCK__ = resetMockState
}

export async function mockRequest(config) {
  if (config.signal?.aborted) {
    const error = new Error('请求已取消')
    error.name = 'CanceledError'
    error.code = 'ERR_CANCELED'
    throw error
  }
  await wait(MOCK_DELAY)
  if (config.signal?.aborted) {
    const error = new Error('请求已取消')
    error.name = 'CanceledError'
    error.code = 'ERR_CANCELED'
    throw error
  }
  const data = await route(config)
  return success(data)
}
