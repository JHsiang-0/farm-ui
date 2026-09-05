# UI-001.0 前端 UI 整改基线

执行日期：2026-09-05  
任务：UI-001 独立前端 UI/UX 整改  
基线状态：已完成，作为后续子任务的进入条件

## 1. 检查范围

已核对：

- AGENTS.md
- FRONTEND_UI_SPECIFICATION.md
- .kiro/specs/farm-ui-remediation/requirements.md
- .kiro/specs/farm-ui-remediation/design.md
- .kiro/specs/farm-ui-v2/requirements.md
- .kiro/specs/farm-ui-v2/design.md
- .kiro/specs/farm-ui-v2/tasks.md
- API_HANDOFF.md
- 运行时 OpenAPI
- 应用 Layout、公共样式、API、Store、路由、主要业务页面和 Playwright 测试

主要页面范围：

登录、服务器连接、概览仪表盘、打印机管理、文件库、任务队列、打印历史、批量派发、用户管理、操作日志和个人中心。

## 2. 运行实例矩阵

| 实例 | 检查结果 | 结论 |
| --- | --- | --- |
| 后端 127.0.0.1:8080 | actuator health 返回 HTTP 200，状态 UP | 可用于契约检查 |
| 后端 /v3/api-docs | HTTP 200，OpenAPI 3.1，FabMatrix Server API，v2.0，包含正式业务路径 | 可用于运行时契约核对 |
| 后端 /swagger-ui.html | HTTP 401 | Swagger UI 访问权限与交接文档存在差异，需记录 |
| 前端 127.0.0.1:5173 | 登录页 HTTP 200；Mock 账号可以进入仪表盘 | 当前可运行 Mock 实例 |
| 前端 127.0.0.1:5174 | 终端请求连接被拒绝；Chrome 中原有页面快照重新导航时报连接拒绝 | 不能作为当前验收实例，疑似旧页面或进程已退出 |
| Electron 开发端口 127.0.0.1:5176 | 本轮未监听 | 尚未进入 Electron 验收 |

注意：Chrome 中 5174 的旧打印机页面曾显示 49 条设备数据，但重新导航失败。因此该画面只能作为用户提供的历史现场证据，不能证明当前源码已正确运行。

## 3. 认证连续性基线

在 5173 Mock 中使用 README 公开的本地调试账号登录成功后可以进入仪表盘。随后通过浏览器直接导航到受保护路由时，页面被重定向到 login，并显示“登录状态已失效，请重新登录”。

该现象需要在 UI-001.3 中继续核对：

- 登录态写入 localStorage/sessionStorage 的时机和范围
- 页面完整导航时 Store 初始化和 /auth/me 恢复顺序
- Mock 与真实后端 Token 生命周期差异
- 直接输入受保护地址与侧栏导航是否使用同一恢复流程

该记录不表示已确定根因，也不允许在页面层添加伪造登录态绕过。

## 4. 页面现场观察

### 4.1 登录和服务器连接

- 登录页保留双栏、动画角色、品牌和表单视觉，应继续保护。
- 服务器连接页已有协议、Host/IP、端口拆分和“测试”“保存并连接”动作。
- 服务器发现不能在没有后端发现契约时伪造。

### 4.2 概览仪表盘

- 已有设备、任务、趋势、状态分布、活动任务、最近任务和异常设备区域。
- 页面数据与实时连接状态有表达。
- 统计卡片较多，首屏信息密度偏高，需要在 UI-001.2 中统一卡片使用和操作入口。

### 4.3 打印机管理

- 页面有搜索、状态、查询、刷新、未分配设备、扫描和新增入口。
- 现场列表存在大量横向字段，操作列有编辑和删除。
- 详情入口不能只依赖整行点击；详情标题缺失时不能显示 undefined。
- 表格、底部分页和局部滚动边界需要在 UI-001.1 和 UI-001.4 中重新验收。

### 4.4 文件库

- 当前实现已有目录树、搜索、材质筛选、Grid/List 和上传入口。
- 文件区域仍存在较多自定义卡片和页面 CSS，和 TDesign Starter 的数据工作台密度不一致。
- 目录、文件、预览、下载、删除和创建任务需要重新组织为连续工作流。

### 4.5 任务队列和历史

- 待派发和活动任务已经使用 Tabs 表达。
- 少量数据时表格容器会产生大面积空白。
- 详情和更多操作的视觉层级偏低。
- 待派发、活动和历史必须按正式状态和接口语义分开。

### 4.6 批量派发

- 已使用 TDesign Steps。
- 当前首屏同时暴露多个 Card/步骤内容，批量上传标题存在重复感。
- 主操作可能落到首屏以下，需要改为聚焦当前步骤的向导。

### 4.7 管理页面

- 用户管理、操作日志和个人中心功能入口存在。
- 少量数据时页面 Card 撑满视口，留白过大。
- 操作日志不能直接暴露 JOB_CANCEL、JOB_START 等原始枚举。

## 5. 代码结构证据

当前应用壳由 layout/index.vue、styles/index.css、styles/theme.css 和公共组件共同控制高度、overflow、间距和 token。

需要重点关注：

- body 和 App Shell 的全局 overflow
- Page Shell、Card 和 Data Region 的 height/min-height
- PrinterManage 的表格外层定位和滚动
- TdTable 兼容层增加的 DOM 和 flex/overflow 边界
- FileLibrary、JobQueue、PrinterManage 中页面级 Tailwind 和自定义 CSS 的共存

页面体量和 Tailwind 类使用量较高，说明问题不是“没有使用 TDesign”，而是 TDesign、Tailwind、自定义 CSS 和兼容层同时控制视觉和布局。

## 6. 当前阻断和风险

### P0

1. 5174 当前无法复现，必须先确认运行实例和 Bundle 版本。
2. 5173 直接导航后的会话失效需要在认证流程中定位。
3. App Shell、Table、Card 和 Drawer 的滚动所有权未完全收口。
4. 打印机详情显式入口、详情字段映射和标题回退需要重新验收。
5. 任务队列数据语义和空白区域需要整改。

### P1

1. 文件库需要从旧卡片式视觉改为 Table 优先、Grid 可选。
2. 批量派发需要减少首屏堆叠并保证当前步骤主操作可见。
3. 用户、日志和个人中心需要使用自然内容高度。
4. 全局状态标签、错误提示和实时状态需要统一。

## 7. 基线退出条件

- [x] 已读取独立 UI Spec 和相关 v2/接口文档。
- [x] 已检查后端健康状态和运行时 OpenAPI。
- [x] 已检查 5173、5174 和 Electron 端口边界。
- [x] 已实际运行并检查 5173 登录和仪表盘。
- [x] 已记录主要页面的视觉和功能问题。
- [x] 已记录运行实例版本不一致和会话连续性风险。
- [ ] 5174 可复现的运行实例确认，转入 UI-001.10 处理。
- [ ] Electron 实际窗口验收，转入 UI-001.10 处理。

## 8. 下一步

进入 UI-001.1，先收口 App Shell、Page Shell、Data Region 和局部滚动边界。未完成 UI-001.1 前，不对 FileLibrary、JobQueue 和 PrinterManage 做大规模页面 CSS 重写。

