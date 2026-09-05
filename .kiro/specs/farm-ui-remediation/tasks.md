# FabMatrix 独立前端 UI 整改任务清单

任务：UI-001 独立前端 UI/UX 整改  
所属 Spec：farm-ui-remediation  
状态说明：[ ] 待完成；[x] 已完成；[-] 有条件跳过并记录原因  
视觉基线：FRONTEND_UI_SPECIFICATION.md

## 0. 任务边界

- 本任务不属于 farm-ui-v2，不修改 v2 任务勾选状态。
- 不新增或猜测 API、字段、业务状态和数据。
- 不修改登录页和首次管理员初始化页已有主视觉。
- 不修改 src/stores/printerStore.js.backup。
- 不执行 git push。
- 每个子任务只暂存本子任务实际修改的文件。

## 1. UI-001 总体验收

### [x] UI-001.0 整改基线和运行实例确认

范围：

- 读取本 Spec、FRONTEND_UI_SPECIFICATION.md、API_HANDOFF.md 和 v2 文档。
- 检查前端地址、Mock 地址、后端健康检查和运行时 OpenAPI。
- 确认实际页面不是旧 Bundle 或旧开发服务器。
- 建立主要页面截图和问题清单。

验收：

- 记录前端实际访问地址和版本来源。
- 记录后端健康状态、OpenAPI 地址和 Swagger UI 访问差异。
- 记录主要页面当前截图。
- 说明 5173、5174 和 Electron 的环境差异。

提交建议：docs: 建立独立 UI 整改验收基线

基线记录：baseline.md。5174 当前无法从终端或浏览器重新导航复现，5173 直接导航后的会话连续性风险已记录；两项转入后续子任务和最终 Electron/浏览器验收，不作为已验证功能。

### [x] UI-001.1 App Shell 和滚动模型

范围：

- src/layout
- src/styles
- 公共页面壳和必要的 Loading 容器

要求：

- 固定 Sidebar、Header、Content 尺寸和间距 token。
- 明确页面、表格、目录树和 Drawer 的滚动所有者。
- 改造互相冲突的 height、overflow 和绝对定位布局。
- 窄屏 Sidebar 不保留桌面布局宽度。

验收：

- 五个目标视口无页面级水平溢出。
- 页面底部、表格分页和 Drawer Footer 完整可见。
- Table、Drawer、文件树可以独立滚动。
- 登录页无视觉回归。

提交建议：fix: 统一独立 UI 整改的应用壳滚动模型

完成记录：页面壳恢复自然纵向高度，滚动责任收敛到 App Content View、TDesign Table 内容区和 Drawer Body；已通过单元测试、浏览器 E2E、Oxlint、ESLint 和生产构建。

### [x] UI-001.2 公共页面模式

范围：

- Page Header
- Query Toolbar
- Data Region
- AsyncState
- Status Tag
- 相关公共组件和语义 token

验收：

- 页面不存在重复标题。
- 主操作层级一致。
- 状态文案、颜色和图标跨页面一致。
- Loading、Empty、Error 不依赖单一 Toast。

提交建议：feat: 建立独立 UI 整改公共页面模式

完成记录：新增 PageHeader、QueryToolbar、DataRegion、StatusTag 公共组件和状态视图模型；打印机、任务、看板及详情组件复用统一状态 Tag；AsyncState 提供区域级 Loading/Empty/Error 与重试语义；已通过单元测试、Oxlint、ESLint 和生产构建。

### [ ] UI-001.3 服务器连接和认证入口

范围：

- ServerConnection.vue
- 登录和首次初始化相关反馈，不重做既有主视觉

验收：

- IP/Host 与端口分离。
- 测试不会意外保存配置。
- 保存并连接成功后进入正确认证流程。
- 初始化未开放、已初始化、请求失败三种状态可区分。
- 登录双栏、动画角色、品牌和表单视觉保持。

提交建议：fix: 完善独立 UI 整改的连接与初始化入口

### [ ] UI-001.4 打印机管理和详情 Drawer

范围：

- PrinterManage.vue
- 打印机详情组件
- 打印机状态适配器和相关测试

验收：

- 列表提供显式详情入口。
- 详情使用正式接口，不由列表行拼装。
- 不出现 undefined、伪造温度和伪造详情。
- Drawer Header/Footer 固定，Body 独立滚动。
- 表格最后一行、分页和操作列完整可见。
- ADMIN/OPERATOR 权限和按钮显隐正确。

提交建议：fix: 重构独立 UI 整改的打印机管理体验

### [ ] UI-001.5 文件库工作台

范围：

- FileLibrary.vue
- 文件树、文件列表、文件详情和上传相关组件

验收：

- 目录、搜索、视图切换和分页状态同步。
- Table 为大数据量默认视图，Grid 为可选视图。
- 空目录有下一步操作。
- 上传失败可区分可重试与不可重试。
- 文件详情不显示内部存储字段。
- 桌面和窄屏均可完成上传或创建任务。

提交建议：fix: 重构独立 UI 整改的文件库工作台

### [ ] UI-001.6 任务队列、活动任务和历史

范围：

- JobQueue.vue
- JobHistory.vue
- 任务详情 Drawer
- 任务状态和动作适配器

验收：

- 待派发只显示 QUEUED。
- 活动任务与历史使用独立数据集和页面表达。
- 少量数据时页面高度自然。
- 操作列显式展示详情和合法动作。
- 409/422 失败后列表和详情恢复服务端状态。

提交建议：fix: 优化独立 UI 整改的任务队列工作流

### [ ] UI-001.7 批量派发向导

范围：

- BatchDispatch.vue
- 批量预览、确认和结果相关组件

验收：

- 选择、策略、预览、确认、结果五步清晰可回退或前进。
- 预览不会创建任务。
- 部分失败保留逐项结果。
- 失败项只在 retryable=true 时出现重试入口。

提交建议：fix: 优化独立 UI 整改的批量派发向导

### [ ] UI-001.8 管理中心、个人中心和全局反馈

范围：

- UserManagement.vue
- AuditLog.vue
- Profile.vue
- 全局通知、403/404/503 和实时连接提示

验收：

- 页面不使用大片无意义留白。
- 日志原始动作转换为用户文案。
- 用户权限和敏感字段不越权。
- 失败刷新保留已有内容。
- 退出、会话失效、实时断开和恢复状态同步。

提交建议：fix: 完善独立 UI 整改的管理与全局反馈

### [ ] UI-001.9 Tailwind 和遗留 CSS 收口

范围：

- 业务页面自定义 CSS
- tailwind.config.js
- 公共 token 和兼容表格层

验收：

- 业务页面不出现第二套颜色和按钮体系。
- 登录页样式无回归。
- 删除重复 CSS 后页面无布局回归。
- 未通过增大局部高度掩盖滚动问题。

提交建议：refactor: 收口独立 UI 整改的遗留样式

### [ ] UI-001.10 真实浏览器和 Electron 视觉验收

范围：

- Playwright 浏览器测试
- Electron smoke/视觉测试
- 主要页面截图和验收报告

验收：

- 使用真实点击、输入、键盘、Drawer、Dialog、分页和滚动。
- 使用真实 Mock/API 数据量，不复制 DOM 制造滚动。
- 页面稳定后再截图。
- 覆盖成功、空、错误、403、409、503、断线和恢复。
- 登录、文件、创建任务、派发和详情主流程可完成。
- 记录未能验证的真实后端、设备或 CORS 条件。

提交建议：test: 完成独立 UI 整改的浏览器与 Electron 验收

## 2. 执行顺序

UI-001.0 → UI-001.1 → UI-001.2 → UI-001.3 → UI-001.4 → UI-001.5 → UI-001.6 → UI-001.7 → UI-001.8 → UI-001.9 → UI-001.10

UI-001.0、UI-001.1 和 UI-001.2 是页面整改前置条件。发现 API 或状态契约冲突时暂停对应子任务并记录，不得在 UI 层伪造解决方案。

## 3. 每个子任务完成模板

子任务：

修改文件：

用户流程影响：

API/OpenAPI 核对：

Loading/Empty/Error：

响应式视口：

测试：

lint：

build：

git status --short：

git diff --check：

提交：

## 4. 总体验收结论

只有所有必选子任务完成、主要业务页面统一采用 TDesign 默认语言、真实 API 数据与页面状态一致、主要视口和 Electron 通过验收、每个子任务有独立提交后，才可将 UI-001 标记为完成。
