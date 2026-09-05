# FabMatrix 独立前端 UI 整改需求

版本：v1.0  
任务标识：UI-001  
任务类型：独立 UI/UX 整改任务  
状态：待实施  
视觉基线：FRONTEND_UI_SPECIFICATION.md  
与 v2 的关系：独立执行，不修改、不替代 farm-ui-v2

## 1. 背景

当前前端已经引入 TDesign Vue Next，但实际页面仍存在旧界面残留、布局滚动冲突、过度 Card、信息密度不一致、详情入口不明确、异步状态不足和运行实例版本不一致等问题。

该任务专门解决 UI/UX 和前端使用体验问题。接口已完成、Mock 已通过或单元测试已通过，均不能直接证明 UI 完成。

## 2. 目标

在不更换现有技术栈、不伪造后端数据、不破坏登录和首次管理员初始化视觉的前提下，统一采用 TDesign Vue Next 默认设计语言，并参考 TDesign Starter Vue Next 基础仪表盘完成业务界面整改。

目标：

1. 建立唯一的应用布局和滚动模型。
2. 统一 Sidebar、Header、Page Header、Toolbar、Table、Form、Dialog、Drawer、Tabs 和 Status Tag。
3. 重新梳理打印机、文件、任务和批量派发工作流。
4. 完善 Loading、Empty、Error、403、409、422、503 和实时陈旧状态。
5. 消除旧页面结构、重复标题、过度 Card 和无意义留白。
6. 通过 375×812 至 1920×855 的主要页面验收。
7. 建立真实浏览器和 Electron 视觉验收门禁。

## 3. 非目标

- 不更换 Vue、Vite、Pinia、Axios、TDesign Vue Next 或 Electron。
- 不新增后端 API、数据库字段、WebSocket 消息或业务状态。
- 不实现后端没有提供契约的局域网服务器发现。
- 不修改登录页和首次管理员初始化页已有双栏、动画角色、品牌和表单主视觉。
- 不修改 farm-ui-v2 的任务状态。
- 不修改或引用 src/stores/printerStore.js.backup。
- 不通过假数据、零值或静态文案掩盖接口缺失。

## 4. 契约与设计基线

实施前必须阅读：

- FRONTEND_UI_SPECIFICATION.md
- API_HANDOFF.md
- .kiro/specs/farm-ui-v2/requirements.md
- .kiro/specs/farm-ui-v2/design.md
- .kiro/specs/farm-ui-v2/tasks.md
- 运行时 /v3/api-docs
- TDesign Starter Vue Next 开发规范
- TDesign Vue Next 组件文档

文档与运行时 OpenAPI 冲突时，暂停相关实现并记录冲突，不得猜测字段、接口或状态。

## 5. 用户角色和主要工作流

### 5.1 ADMIN

- 登录或首次初始化管理员账号。
- 查看仪表盘和设备实时状态。
- 查询、扫描、新增、编辑和维护打印机。
- 管理文件、任务、用户和操作日志。
- 执行批量派发并查看逐项结果。

### 5.2 OPERATOR

- 登录并查看允许访问的业务页面。
- 查询设备和实时状态。
- 上传、浏览、预览和下载本人可见文件。
- 创建、派发和控制权限范围内的任务。
- 查看任务详情和历史。

### 5.3 主工作流

服务器连接或初始化 → 登录与会话恢复 → 工作台 → 设备、文件、任务或批量派发。

页面跳转、刷新和操作成功后必须保持用户上下文，不得回到无关页面或显示过期数据。

## 6. 功能需求

### R-UI-001 应用布局

系统使用一个明确的 TDesign Layout 层级：Sidebar/Aside、Header、Content、Breadcrumb（必要时）和 Route View。

验收：

- 桌面 Sidebar、Header、Content 尺寸和间距统一。
- 窄屏 Sidebar 使用覆盖式导航，不保留桌面固定宽度。
- 页面没有无来源的水平溢出。
- 页面底部内容、分页和操作栏完整可访问。

### R-UI-002 滚动模型

每个滚动区域必须有唯一滚动所有者。

验收：

- App Shell 不与业务表格争夺滚动。
- Table 使用一个确定的 maxHeight 或固定高度容器。
- Drawer Body 滚动，Header/Footer 固定。
- 文件树和文件列表滚动边界清晰。
- 不使用绝对定位和多层 overflow hidden 掩盖布局问题。

### R-UI-003 页面头和操作层级

每个业务页只有一套 Page Header，并按 Primary、Secondary、Text、Danger 建立层级。

验收：

- 标题不重复。
- 首屏最多一个 Primary 主操作。
- 刷新、筛选、创建、导入位置一致。
- 关键详情和编辑入口不只依赖整行点击或“更多”菜单。

### R-UI-004 打印机管理

打印机管理围绕“查询设备 → 查看详情 → 执行维护或控制”组织。

验收：

- 列表使用正式 printers/page 数据。
- 列表提供显式详情入口，整行点击只能作为辅助入口。
- 详情调用 printers/{id}，不得由列表行拼装伪详情。
- 标题缺失时使用稳定回退文案，不出现 undefined。
- 历史和统计使用正式接口；缺数据显示明确空态。
- 状态使用正式打印机状态枚举和统一文案。
- 表格最后一行、分页和操作列不被截断。

### R-UI-005 文件库

文件库围绕“定位目录 → 查找文件 → 预览或下载 → 创建任务”组织。

验收：

- 目录树和当前目录内容来源于正式契约。
- 查询使用 fileName、materialType、parentId 等正式字段。
- 使用 folder 表达目录，不依赖废弃字段 isFolder。
- 大数据量默认使用 Table，Grid 为可选视图。
- 上传、预览、下载、删除和创建任务入口清晰。
- 上传批次逐项展示成功、失败原因和可重试性。
- 空目录提供符合契约的下一步操作。

### R-UI-006 任务中心

任务页面按后端状态语义区分待派发、活动任务和历史任务。

验收：

- 待派发页只显示 QUEUED。
- 活动任务显示 ASSIGNED、UPLOADING、READY、PRINTING、PAUSED、RECONCILING。
- 历史页按正式分页接口查询并读取 completedAt。
- 任务详情调用正式详情接口。
- 操作只在后端允许的状态下显示。
- 少量数据不会撑满整个视口制造巨大空白。

### R-UI-007 批量派发

批量派发使用聚焦当前步骤的 TDesign Steps：

1. 选择文件和打印机
2. 配置策略
3. 无副作用预览
4. 确认执行
5. 查看逐项结果

验收：

- 首屏不堆叠所有步骤内容。
- 预览不创建任务、不占用打印机。
- 确认使用后端返回的计划 ID、版本和确认令牌。
- 部分失败保留成功项，并按 retryable 决定重试入口。

### R-UI-008 状态和反馈

所有页面统一处理首次加载、局部刷新、空数据、401、403、404、409、422、503、WebSocket 断开、数据陈旧和恢复。

验收：

- 错误信息不只依赖 Toast。
- 页面保留可恢复上下文。
- Loading 不阻塞不相关区域。
- 失败刷新不会清空已有权威数据。

### R-UI-009 TDesign 和样式治理

- 业务页优先使用 TDesign 官方组件。
- 颜色、间距、圆角、阴影和状态样式使用 TDesign 或项目语义 token。
- 登录页可以保留现有自定义视觉。
- 业务页不得新增与 TDesign 重复的 Button、Tag、Alert 或表格视觉。
- 新增 CSS 必须注明布局职责和滚动边界。

### R-UI-010 响应式和可访问性

验收：

- 通过 375×812、768×1024、1024×768、1440×900、1920×855。
- 键盘可完成导航、筛选、提交、关闭和确认。
- 图标按钮有可访问名称。
- Focus 状态可见。
- 状态不只依靠颜色表达。
- Dialog/Drawer 关闭后焦点返回触发元素。

## 7. 发布门禁

完成 UI-001 或任一子任务前必须：

1. 核对 API_HANDOFF.md 和运行时 OpenAPI。
2. 说明受影响的用户流程和页面状态。
3. 执行相关测试。
4. 涉及 JavaScript/Vue 时执行 npm run lint。
5. 执行 npm run build。
6. 执行真实浏览器或 Electron 验收。
7. 执行 git status --short 和 git diff --check。
8. 只暂存当前子任务文件。
9. 创建一次 Conventional Commit 中文提交。
10. 不执行 git push。

