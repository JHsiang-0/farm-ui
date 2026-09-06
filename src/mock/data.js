const clone = value => JSON.parse(JSON.stringify(value))

const mockFileUrl = name => {
  const content = `; Mock G-code: ${name}\nG28\nG1 X10 Y10 F3000\nM104 S0\n`
  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`
}

// 用于测试打印机管理分页、筛选、状态标签和横向滚动的扩展设备数据。
const createAdditionalPrinters = () => {
  const models = ['拓竹 A1', '拓竹 X1-Carbon', '创想三维 K1 Max', '拓竹 P1S']
  const materials = ['PLA', 'PETG', 'ABS', 'TPU']
  const profiles = [
    { status: 'PRINTING', isSafeToPrint: true, progress: 28, currentLayer: 84, totalLayers: 300, printSpeed: 100, currentJobFileName: '机甲面罩.gcode', currentJobStatus: 'PRINTING' },
    { status: 'IDLE', isSafeToPrint: true },
    { status: 'IDLE', isSafeToPrint: false },
    { status: 'PAUSED', isSafeToPrint: true, progress: 46, currentLayer: 138, totalLayers: 300, printSpeed: 80, currentJobFileName: '支架组件.gcode', currentJobStatus: 'PAUSED' },
    { status: 'OFFLINE', isSafeToPrint: false },
    { status: 'ERROR', isSafeToPrint: false, lastError: '热床温度异常' },
    { status: 'PRINTING', isSafeToPrint: true, progress: 71, currentLayer: 213, totalLayers: 300, printSpeed: 100, currentJobFileName: '外壳组件.gcode', currentJobStatus: 'PRINTING' },
    { status: 'IDLE', isSafeToPrint: true },
    { status: 'IDLE', isSafeToPrint: false },
    { status: 'OFFLINE', isSafeToPrint: false },
    { status: 'PRINTING', isSafeToPrint: true, progress: 12, currentLayer: 36, totalLayers: 300, printSpeed: 90, currentJobFileName: '齿轮样件.gcode', currentJobStatus: 'PRINTING' },
    { status: 'PAUSED', isSafeToPrint: false, progress: 63, currentLayer: 189, totalLayers: 300, printSpeed: 70, currentJobFileName: '连接件.gcode', currentJobStatus: 'PAUSED' },
    { status: 'IDLE', isSafeToPrint: true },
    { status: 'ERROR', isSafeToPrint: false, lastError: '喷嘴温度异常' },
    { status: 'IDLE', isSafeToPrint: false },
    { status: 'PRINTING', isSafeToPrint: true, progress: 88, currentLayer: 264, totalLayers: 300, printSpeed: 100, currentJobFileName: '面板组件.gcode', currentJobStatus: 'PRINTING' },
    { status: 'OFFLINE', isSafeToPrint: false },
    { status: 'IDLE', isSafeToPrint: true },
    { status: 'PAUSED', isSafeToPrint: true, progress: 35, currentLayer: 105, totalLayers: 300, printSpeed: 80, currentJobFileName: '外观件.gcode', currentJobStatus: 'PAUSED' },
    { status: 'ERROR', isSafeToPrint: false, lastError: '通信连接中断' },
    { status: 'PRINTING', isSafeToPrint: true, progress: 54, currentLayer: 162, totalLayers: 300, printSpeed: 100, currentJobFileName: '测试夹具.gcode', currentJobStatus: 'PRINTING' },
    { status: 'IDLE', isSafeToPrint: false },
    { status: 'IDLE', isSafeToPrint: true },
    { status: 'OFFLINE', isSafeToPrint: false },
    { status: 'PRINTING', isSafeToPrint: true, progress: 6, currentLayer: 18, totalLayers: 300, printSpeed: 90, currentJobFileName: '定位板.gcode', currentJobStatus: 'PRINTING' }
  ]

  return profiles.map((profile, index) => {
    const id = 409 + index
    const zoneIndex = Math.floor(index / 9)
    const zone = `${String.fromCharCode(65 + zoneIndex)}区`
    const material = materials[index % materials.length]
    const firmwareType = index % 3 === 0 ? 'RRF' : 'KLIPPER'

    return {
      id,
      name: `Printer_${String(index + 7).padStart(2, '0')}`,
      machineModel: models[index % models.length],
      machineNumber: `${String.fromCharCode(65 + zoneIndex)}-${String((index % 9) + 1).padStart(2, '0')}`,
      ipAddress: `192.168.${zoneIndex + 1}.${86 + index}`,
      macAddress: `AA:BB:CC:DD:EF:${String(index + 7).padStart(2, '0')}`,
      firmwareType,
      currentJobId: null,
      currentMaterial: material,
      nozzleSize: [0.4, 0.6, 0.8][index % 3],
      zone,
      progress: 0,
      currentLayer: 0,
      totalLayers: 0,
      printSpeed: 0,
      gridRow: zoneIndex + 2,
      gridCol: (index % 9) + 1,
      createdAt: `2026-09-01T11:${String(index).padStart(2, '0')}:00`,
      updatedAt: `2026-09-02T16:${String(index).padStart(2, '0')}:00`,
      ...profile
    }
  })
}

const createAdditionalFiles = () => {
  const names = [
    '机甲面罩', '面板组件', '齿轮样件', '定位支架', '连接件', '外壳组件', '测试夹具', '散热风道',
    '安装底座', '电机支架', '传感器外壳', '装配治具', '线缆固定座', '机器人关节', '相机支架', '风扇罩',
    '快速夹具', '结构样件', '按钮面板', '工具托盘', '灯带卡扣', '校准模型', '保护盖板', '小型齿轮',
    '实验支架', '收纳盒', '打印测试件', '机械臂末端', '定位销', '设备铭牌'
  ]
  const materials = ['PLA', 'PETG', 'ABS', 'TPU']
  const models = ['A1', 'X1-Carbon', 'P1S', 'K1 Max']

  return names.map((name, index) => {
    const id = 24 + index
    const materialType = materials[index % materials.length]
    const extension = index % 5 === 0 ? 'bgcode' : 'gcode'
    const fileName = `${name}.${extension}`
    const fileSize = 48 * 1024 + index * 8192
    const estimatedSeconds = 1200 + index * 180

    return {
      id,
      parentId: null,
      folder: false,
      isFolder: 0,
      originalName: fileName,
      safeName: fileName,
      fileSize,
      fileUrl: mockFileUrl(fileName),
      userId: index % 5 === 0 ? 2 : 1,
      createdAt: `2026-09-${String((index % 2) + 1).padStart(2, '0')}T${String(10 + (index % 8)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}:00`,
      estTime: estimatedSeconds,
      estimatedSeconds,
      materialType,
      machineModel: models[index % models.length],
      buildPlate: index % 2 === 0 ? 'Textured PEI Plate' : 'High Temp Plate',
      nozzleSize: [0.4, 0.6, 0.8][index % 3],
      filamentWeight: Number((5.5 + index * 1.7).toFixed(1)),
      filamentLength: 1200 + index * 280,
      nozzleTemp: materialType === 'ABS' ? 245 : materialType === 'PETG' ? 235 : 210,
      bedTemp: materialType === 'ABS' ? 90 : materialType === 'PETG' ? 75 : 60,
      layerHeight: index % 3 === 0 ? 0.2 : index % 3 === 1 ? 0.16 : 0.28,
      firstLayerHeight: 0.24,
      firstLayerNozzleTemp: materialType === 'ABS' ? 250 : 215,
      firstLayerBedTemp: materialType === 'ABS' ? 90 : 60,
      printCount: index % 7,
      successRate: index % 6 === 0 ? 0 : Number((82 + (index % 5) * 3.5).toFixed(1))
    }
  })
}

const createAdditionalJobs = () => {
  const statuses = [
    'QUEUED', 'ASSIGNED', 'READY', 'PRINTING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED',
    'QUEUED', 'READY', 'ASSIGNED', 'PRINTING', 'COMPLETED', 'FAILED', 'QUEUED', 'PAUSED',
    'READY', 'COMPLETED', 'CANCELLED', 'QUEUED', 'ASSIGNED', 'PRINTING', 'FAILED', 'READY',
    'COMPLETED', 'QUEUED', 'PAUSED', 'CANCELLED', 'ASSIGNED', 'COMPLETED'
  ]
  const activeStatuses = new Set(['ASSIGNED', 'READY', 'PRINTING', 'PAUSED'])

  return statuses.map((status, index) => {
    const id = 1007 + index
    const progress = status === 'COMPLETED'
      ? 100
      : status === 'PRINTING' || status === 'PAUSED' || status === 'FAILED'
        ? 15 + (index * 11) % 75
        : 0
    const createdAt = `2026-09-${String((index % 2) + 1).padStart(2, '0')}T${String(9 + (index % 9)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}:00`

    return {
      id,
      fileId: 24 + index,
      printerId: activeStatuses.has(status) ? 409 + (index % 25) : null,
      userId: index % 4 === 0 ? 2 : 1,
      operatorId: index % 3 === 0 ? 2 : null,
      priority: [90, 75, 60, 45, 30, 20, 10][index % 7],
      status,
      progress,
      startedAt: activeStatuses.has(status) || status === 'COMPLETED' || status === 'FAILED'
        ? `2026-09-${String((index % 2) + 1).padStart(2, '0')}T${String(10 + (index % 8)).padStart(2, '0')}:00:00`
        : null,
      completedAt: ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status) ? createdAt : null,
      errorReason: status === 'FAILED' ? (index % 2 === 0 ? '喷嘴温度异常' : '打印机通信中断') : null,
      createdAt,
      updatedAt: createdAt
    }
  })
}

const createAdditionalUsers = () => {
  const profiles = [
    { username: 'ops_north', role: 'OPERATOR', email: 'ops.north@farm.local', department: '北区生产车间 / 一组' },
    { username: 'ops_south', role: 'OPERATOR', email: 'ops.south@farm.local', department: '南区生产车间 / 二组' },
    { username: 'ops_quality', role: 'OPERATOR', email: 'ops.quality@farm.local', department: '质量检验中心 / 质检组' },
    { username: 'ops_maintenance', role: 'OPERATOR', email: 'ops.maintenance@farm.local', department: '设备运维中心 / 维护组' },
    { username: 'ops_material', role: 'OPERATOR', email: 'ops.material@farm.local', department: '物料管理中心 / 仓储组' },
    { username: 'ops_night', role: 'OPERATOR', email: 'ops.night@farm.local', department: '生产车间 / 夜班组', enabled: false },
    { username: 'ops_training', role: 'OPERATOR', email: 'ops.training@farm.local', department: '生产运营中心 / 培训组' },
    { username: 'ops_test', role: 'OPERATOR', email: 'ops.test@farm.local', department: '研发测试中心 / 测试组' },
    { username: 'ops_backup', role: 'OPERATOR', email: 'ops.backup@farm.local', department: '生产运营中心 / 备用组', enabled: false },
    { username: 'admin_ops', role: 'ADMIN', email: 'admin.ops@farm.local', department: '系统管理中心 / 运维组' },
    { username: 'admin_security', role: 'ADMIN', email: 'admin.security@farm.local', department: '系统管理中心 / 安全组' },
    { username: 'admin_audit', role: 'ADMIN', email: 'admin.audit@farm.local', department: '审计管理中心 / 审计组', enabled: false },
    { username: 'ops_alpha', role: 'OPERATOR', email: 'ops.alpha@farm.local', department: 'A区生产车间 / 一组' },
    { username: 'ops_beta', role: 'OPERATOR', email: 'ops.beta@farm.local', department: 'B区生产车间 / 一组' },
    { username: 'ops_gamma', role: 'OPERATOR', email: 'ops.gamma@farm.local', department: 'C区生产车间 / 一组' },
    { username: 'ops_support', role: 'OPERATOR', email: 'ops.support@farm.local', department: '客户支持中心 / 技术组' },
    { username: 'ops_archive', role: 'OPERATOR', email: 'ops.archive@farm.local', department: '资料管理中心 / 归档组', enabled: false },
    { username: 'admin_system', role: 'ADMIN', email: 'admin.system@farm.local', department: '系统管理中心 / 平台组' }
  ]

  return profiles.map((profile, index) => {
    const minute = String((index * 3) % 60).padStart(2, '0')
    const hour = String(10 + (index % 8)).padStart(2, '0')
    const createdAt = `2026-09-02T${hour}:${minute}:00`
    return {
      id: 3 + index,
      username: profile.username,
      password: 'User1234',
      role: profile.role,
      email: profile.email,
      department: profile.department,
      phone: null,
      enabled: profile.enabled !== false,
      lastLoginAt: profile.enabled === false ? null : createdAt,
      createdAt,
      updatedAt: createdAt
    }
  })
}

const createSeedData = () => ({
  users: [
    {
      id: 1,
      username: 'admin',
      password: 'Admin123',
      role: 'ADMIN',
      email: 'admin@farm.local',
      phone: null,
      enabled: true,
      createdAt: '2026-09-01T09:00:00',
      updatedAt: '2026-09-01T09:00:00'
    },
    {
      id: 2,
      username: 'operator',
      password: 'Operator123',
      role: 'OPERATOR',
      email: 'operator@farm.local',
      phone: null,
      enabled: true,
      createdAt: '2026-09-01T09:10:00',
      updatedAt: '2026-09-01T09:10:00'
    },
    ...createAdditionalUsers()
  ],
  printers: [
    {
      id: 403,
      name: 'Printer_C0DA',
      machineModel: '拓竹 A1',
      machineNumber: 'A-01',
      ipAddress: '192.168.1.80',
      macAddress: 'AA:BB:CC:DD:EE:01',
      firmwareType: 'KLIPPER',
      status: 'PRINTING',
      isSafeToPrint: true,
      currentJobId: 1001,
      currentJobStatus: 'PRINTING',
      currentJobFileName: 'gearbox.gcode',
      currentMaterial: 'PLA',
      nozzleSize: 0.4,
      zone: 'A区',
      progress: 62,
      currentLayer: 186,
      totalLayers: 300,
      printSpeed: 100,
      gridRow: 1,
      gridCol: 1,
      createdAt: '2026-09-01T10:00:00',
      updatedAt: '2026-09-02T17:10:30'
    },
    {
      id: 404,
      name: 'Printer_A12F',
      machineModel: '拓竹 A1',
      machineNumber: 'A-02',
      ipAddress: '192.168.1.81',
      macAddress: 'AA:BB:CC:DD:EE:02',
      firmwareType: 'KLIPPER',
      status: 'IDLE',
      isSafeToPrint: false,
      currentJobId: null,
      currentMaterial: 'PETG',
      nozzleSize: 0.4,
      zone: 'A区',
      progress: 0,
      currentLayer: 0,
      totalLayers: 0,
      printSpeed: 0,
      gridRow: 1,
      gridCol: 2,
      createdAt: '2026-09-01T10:05:00',
      updatedAt: '2026-09-02T17:00:00'
    },
    {
      id: 405,
      name: 'Printer_B07E',
      machineModel: '拓竹 X1-Carbon',
      machineNumber: 'A-03',
      ipAddress: '192.168.1.82',
      macAddress: 'AA:BB:CC:DD:EE:03',
      firmwareType: 'RRF',
      status: 'PAUSED',
      isSafeToPrint: true,
      currentJobId: 1002,
      currentJobStatus: 'PAUSED',
      currentJobFileName: 'enclosure.gcode',
      currentMaterial: 'ABS',
      nozzleSize: 0.6,
      zone: 'A区',
      progress: 18,
      currentLayer: 54,
      totalLayers: 300,
      printSpeed: 80,
      gridRow: 1,
      gridCol: 3,
      createdAt: '2026-09-01T10:10:00',
      updatedAt: '2026-09-02T17:05:00'
    },
    {
      id: 406,
      name: 'Printer_OFFLINE',
      machineModel: '创想三维 K1 Max',
      machineNumber: 'B-01',
      ipAddress: '192.168.1.83',
      macAddress: 'AA:BB:CC:DD:EE:04',
      firmwareType: 'KLIPPER',
      status: 'OFFLINE',
      isSafeToPrint: false,
      currentJobId: null,
      currentMaterial: 'PLA',
      nozzleSize: 0.4,
      zone: 'B区',
      progress: 0,
      currentLayer: 0,
      totalLayers: 0,
      printSpeed: 0,
      gridRow: 2,
      gridCol: 1,
      createdAt: '2026-09-01T10:15:00',
      updatedAt: '2026-09-02T16:50:00'
    },
    {
      id: 407,
      name: 'Printer_ERROR',
      machineModel: '拓竹 P1S',
      machineNumber: 'B-02',
      ipAddress: '192.168.1.84',
      macAddress: 'AA:BB:CC:DD:EE:05',
      firmwareType: 'RRF',
      status: 'ERROR',
      isSafeToPrint: false,
      currentJobId: null,
      currentMaterial: 'TPU',
      nozzleSize: 0.8,
      zone: 'B区',
      progress: 0,
      currentLayer: 0,
      totalLayers: 0,
      printSpeed: 0,
      lastError: '喷嘴温度异常',
      gridRow: 2,
      gridCol: 2,
      createdAt: '2026-09-01T10:20:00',
      updatedAt: '2026-09-02T16:45:00'
    },
    {
      id: 408,
      name: 'Printer_CLEAN',
      machineModel: '拓竹 X1-Carbon',
      machineNumber: 'B-03',
      ipAddress: '192.168.1.85',
      macAddress: 'AA:BB:CC:DD:EE:06',
      firmwareType: 'KLIPPER',
      status: 'IDLE',
      isSafeToPrint: false,
      currentJobId: null,
      currentMaterial: 'PLA',
      nozzleSize: 0.4,
      zone: 'B区',
      progress: 0,
      currentLayer: 0,
      totalLayers: 0,
      printSpeed: 0,
      gridRow: null,
      gridCol: null,
      createdAt: '2026-09-01T10:25:00',
      updatedAt: '2026-09-02T16:40:00'
    },
    ...createAdditionalPrinters()
  ],
  files: [
    {
      id: 1,
      parentId: null,
      folder: true,
      isFolder: 1,
      originalName: '产品样件',
      safeName: 'product-samples',
      fileCount: 1,
      fileSize: 0,
      fileUrl: null,
      userId: 1,
      createdAt: '2026-09-01T09:30:00',
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
    },
    {
      id: 2,
      parentId: null,
      folder: true,
      isFolder: 1,
      originalName: '测试文件',
      safeName: 'test-files',
      fileCount: 1,
      fileSize: 0,
      fileUrl: null,
      userId: 2,
      createdAt: '2026-09-01T09:35:00',
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
    },
    {
      id: 20,
      parentId: null,
      folder: false,
      isFolder: 0,
      originalName: 'gearbox.gcode',
      safeName: 'gearbox.gcode',
      fileSize: 123456,
      fileUrl: mockFileUrl('gearbox.gcode'),
      userId: 1,
      createdAt: '2026-09-02T17:00:00',
      estTime: 3600,
      estimatedSeconds: 3600,
      materialType: 'PLA',
      machineModel: 'A1',
      buildPlate: 'Textured PEI Plate',
      nozzleSize: 0.4,
      filamentWeight: 12.5,
      filamentLength: 3000,
      nozzleTemp: 210,
      bedTemp: 60,
      layerHeight: 0.2,
      firstLayerHeight: 0.24,
      firstLayerNozzleTemp: 215,
      firstLayerBedTemp: 60,
      printCount: 4,
      successRate: 100
    },
    {
      id: 21,
      parentId: null,
      folder: false,
      isFolder: 0,
      originalName: 'enclosure.gcode',
      safeName: 'enclosure.gcode',
      fileSize: 245760,
      fileUrl: mockFileUrl('enclosure.gcode'),
      userId: 1,
      createdAt: '2026-09-02T16:30:00',
      estTime: 5400,
      estimatedSeconds: 5400,
      materialType: 'ABS',
      machineModel: 'X1-Carbon',
      buildPlate: 'High Temp Plate',
      nozzleSize: 0.6,
      filamentWeight: 38.2,
      filamentLength: 8200,
      nozzleTemp: 245,
      bedTemp: 90,
      layerHeight: 0.2,
      firstLayerHeight: 0.24,
      firstLayerNozzleTemp: 250,
      firstLayerBedTemp: 90,
      printCount: 2,
      successRate: 50
    },
    {
      id: 22,
      parentId: 1,
      folder: false,
      isFolder: 0,
      originalName: 'bracket.gcode',
      safeName: 'bracket.gcode',
      fileSize: 65536,
      fileUrl: mockFileUrl('bracket.gcode'),
      userId: 1,
      createdAt: '2026-09-02T15:20:00',
      estTime: 1800,
      estimatedSeconds: 1800,
      materialType: 'PETG',
      machineModel: 'A1',
      buildPlate: 'Textured PEI Plate',
      nozzleSize: 0.4,
      filamentWeight: 8.4,
      filamentLength: 1900,
      nozzleTemp: 235,
      bedTemp: 75,
      layerHeight: 0.16,
      firstLayerHeight: 0.2,
      firstLayerNozzleTemp: 240,
      firstLayerBedTemp: 75,
      printCount: 8,
      successRate: 87.5
    },
    {
      id: 23,
      parentId: 2,
      folder: false,
      isFolder: 0,
      originalName: 'calibration.bgcode',
      safeName: 'calibration.bgcode',
      fileSize: 32768,
      fileUrl: mockFileUrl('calibration.bgcode'),
      userId: 2,
      createdAt: '2026-09-02T14:10:00',
      estTime: 900,
      estimatedSeconds: 900,
      materialType: 'PLA',
      machineModel: 'P1S',
      buildPlate: 'Textured PEI Plate',
      nozzleSize: 0.4,
      filamentWeight: 3.2,
      filamentLength: 720,
      nozzleTemp: 205,
      bedTemp: 60,
      layerHeight: 0.2,
      firstLayerHeight: 0.24,
      firstLayerNozzleTemp: 210,
      firstLayerBedTemp: 60,
      printCount: 12,
      successRate: 100
    },
    ...createAdditionalFiles()
  ],
  jobs: [
    {
      id: 1001,
      fileId: 20,
      printerId: 403,
      userId: 1,
      operatorId: 2,
      priority: 80,
      status: 'PRINTING',
      progress: 35.5,
      startedAt: '2026-09-02T17:10:00',
      completedAt: null,
      errorReason: null,
      createdAt: '2026-09-02T17:00:00',
      updatedAt: '2026-09-02T17:10:30'
    },
    {
      id: 1002,
      fileId: 21,
      printerId: 405,
      userId: 1,
      operatorId: 2,
      priority: 60,
      status: 'PAUSED',
      progress: 62,
      startedAt: '2026-09-02T16:10:00',
      completedAt: null,
      errorReason: null,
      createdAt: '2026-09-02T16:00:00',
      updatedAt: '2026-09-02T16:50:00'
    },
    {
      id: 1003,
      fileId: 22,
      printerId: null,
      userId: 1,
      operatorId: null,
      priority: 40,
      status: 'QUEUED',
      progress: 0,
      startedAt: null,
      completedAt: null,
      errorReason: null,
      createdAt: '2026-09-02T15:30:00',
      updatedAt: '2026-09-02T15:30:00'
    },
    {
      id: 1004,
      fileId: 23,
      printerId: null,
      userId: 2,
      operatorId: null,
      priority: 20,
      status: 'COMPLETED',
      progress: 100,
      startedAt: '2026-09-02T14:20:00',
      completedAt: '2026-09-02T14:35:00',
      errorReason: null,
      createdAt: '2026-09-02T14:15:00',
      updatedAt: '2026-09-02T14:35:00'
    },
    {
      id: 1005,
      fileId: 20,
      printerId: null,
      userId: 1,
      operatorId: null,
      priority: 10,
      status: 'FAILED',
      progress: 18,
      startedAt: '2026-09-01T18:00:00',
      completedAt: null,
      errorReason: '喷嘴温度异常',
      createdAt: '2026-09-01T17:50:00',
      updatedAt: '2026-09-01T18:20:00'
    },
    {
      id: 1006,
      fileId: 21,
      printerId: null,
      userId: 2,
      operatorId: null,
      priority: 5,
      status: 'CANCELLED',
      progress: 0,
      startedAt: null,
      completedAt: null,
      errorReason: null,
      createdAt: '2026-09-01T16:00:00',
      updatedAt: '2026-09-01T16:10:00'
    },
    ...createAdditionalJobs()
  ],
  nextIds: {
    users: 21,
    file: 54,
    folder: 3,
    job: 1037,
    printer: 434
  },
  sessions: {}
})

export const mockState = createSeedData()

export function resetMockState() {
  const seed = createSeedData()
  Object.keys(mockState).forEach(key => {
    mockState[key] = clone(seed[key])
  })
}

export function nextMockId(type) {
  const id = mockState.nextIds[type]
  mockState.nextIds[type] += 1
  return id
}

export function cloneMockData(value) {
  return clone(value)
}
