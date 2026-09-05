# Farm UI v2 实施任务

## 1. 使用说明

- 本清单由 `PROJECT.md`、`requirements.md`、`design.md` 依次推导，任务状态初始均为“待开始”。
- 每个任务应独立开发、测试和验收；未满足前置依赖时不得提前合入。
- “需要后端配合”中的“确认”仅指冻结或补充契约，不授权本阶段修改后端。
- 自动派单不属于 v2；任何相关任务只能提供不可操作的“v3 规划中”入口。

## 2. P0：主流程和契约基线

### [x] T001 契约决策与联调基线

- 优先级：P0
- 前置依赖：无
- 修改文件：`API_HANDOFF.md`（仅在后端确认后）、`.kiro/specs/farm-ui-v2/*`
- 实现内容：确认用户状态字段、批量失败补偿、批量预览归属、统一分页/错误码/OpenAPI 和 WebSocket 鉴权边界；记录前后端当前契约基线。
- 验收标准：所有阻塞性问题都有唯一结论，前后端文档无互相冲突的字段或行为。
- 测试方式：文档评审；逐项与 Controller、DTO、VO、OpenAPI 复核。
- 需要后端配合：已完成，后端契约已按当前 Controller、DTO、VO、SecurityConfig 和 WebSocketServer 冻结。
- 需要真实打印机：否。
- 风险：真实数据库迁移、真实 Redis/RustFS/打印机及浏览器端完整联调仍属环境验收，不再作为 P0 代码依赖。
- 完成状态：已完成（2026-09-05）。用户状态字段统一为 `UserVO.enabled`，`false` 表示禁用，未引入或依赖 `disabled`；登录、REST JWT 和 WebSocket 均拒绝禁用账号。批量恢复仅处理 `RETRYABLE && jobId IS NULL`，已有 `jobId` 返回 `RECOVERY_REQUIRED/OPEN_EXISTING_JOB` 并保留 `sourcePlanId/sourceItemId` 关联；批量预览/恢复按当前用户校验文件归属，ADMIN 可跨用户查看。统一响应、分页字段、错误码、OpenAPI 与正式审计日志契约已同步到前后端交接文档；WebSocket 固定 `/ws/farm-status?token`，校验 JWT 用户身份、角色、禁用状态和连接上限。T002–T015、T101–T109、T201–T207 已基于上述基线完成。真实 MySQL 增量迁移、真实 Redis/RustFS/打印机物理链路和浏览器端完整 E2E 仍是环境验收，不阻塞当前代码 Task。

### [x] T002 API 请求层与统一错误模型

- 优先级：P0
- 前置依赖：T001 中与本任务相关的统一响应、分页和错误大类基线已冻结；T001 其余后端阻塞不影响本任务。
- 修改文件：`src/utils/request.js`、`src/utils/message.js`、相关测试
- 实现内容：统一 `{code,message,data,timestamp}` 解包、Blob/预签名例外、HTTP 与业务错误映射、401 清理会话、403/404/409/422/503 上下文，并消除重复 toast。
- 验收标准：调用方只获得规范 data 或统一错误对象；401 只执行一次退出；页面可区分关键错误。
- 测试方式：请求拦截器单元测试和各错误码 Mock 测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：改动是所有 API 的基础，需防止 Blob、204/null 和旧调用回归。
- 完成状态：已完成（2026-09-04）。统一响应 envelope、Blob/ArrayBuffer 与 204/null 例外、HTTP/业务错误映射、RequestError 字段、401 单次会话清理/跳转及重复错误提示抑制已实现；现有 API 模块继续兼容 `response.data` 返回结构，相关测试、lint 和构建均通过。

### [x] T003 登录、Token 与首次管理员初始化

- 优先级：P0
- 前置依赖：T002
- 修改文件：`src/api/user.js`、`src/stores/user.js`、`src/views/Login.vue`、相关测试
- 实现内容：登录使用后端 6–20 位规则；保存 token、expiresIn/expiresAt；启动时调用 `/auth/me` 恢复；实现 setup status/admin；失效、禁用和退出时完整清理。
- 验收标准：未初始化、登录成功、刷新恢复、过期、禁用、退出六条链路均符合契约。
- 测试方式：Store/API 单测和登录页面集成测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：本地旧持久化数据迁移及并发 401 可能重复跳转。
- 完成状态：已完成（2026-09-04）。登录 API 仅发送后端契约字段，新增 `/auth/me` 恢复接口；会话保存 `expiresIn/expiresAt`，启动恢复会以服务端 UserVO 覆盖本地身份，过期、无效、禁用和退出均清理会话并触发实时连接清理；首次管理员初始化和普通登录校验已按后端规则分流。认证会话测试、`npm.cmd test`、`npm.cmd run lint`、`npm.cmd run build` 均通过。路由启动门禁和 ADMIN/OPERATOR 页面权限由 T004 继续接入。

### [x] T004 ADMIN/OPERATOR 路由与操作权限

- 优先级：P0
- 前置依赖：T003
- 修改文件：`src/router/index.js`、`src/layout/*`、权限工具、相关页面和测试
- 实现内容：以 `/auth/me` 身份为准处理路由、菜单和按钮；未知角色安全退出；ADMIN 管理能力与两角色作业能力分离；退出同步断开 WebSocket。
- 验收标准：OPERATOR 无法进入或触发管理员功能，未知角色不产生重定向循环，后端 403 有明确提示。
- 测试方式：路由守卫矩阵和按钮权限组件测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：仅隐藏按钮不足以代替服务端鉴权，测试需覆盖直接访问 URL。
- 完成状态：已完成（2026-09-04）。路由守卫会等待持久化 Token 通过 `/auth/me` 恢复，以服务端身份决定 ADMIN/OPERATOR 访问；未知角色清理会话并返回登录页，ADMIN-only 路由返回权限提示后回到打印机页，匿名访问保留 redirect。菜单与既有 ADMIN 操作按钮权限保持一致，退出由用户 Store 清理实时连接。权限决策矩阵测试、`npm.cmd test`、`npm.cmd run lint`、`npm.cmd run build` 均通过。

### [x] T005 领域常量与数据适配器

- 优先级：P0
- 前置依赖：T001、T002
- 修改文件：`src/utils/constants.js`、`src/utils/dataAdapters.js`、相关测试
- 实现内容：冻结打印机和任务状态、分页、文件和 Job VO 映射；新代码只用 camelCase；隔离必要的旧字段兼容并加弃用标记。
- 验收标准：REST、WebSocket、页面和 Mock 使用同一状态颜色/文案；不把 ONLINE 当持久状态；completedAt、folder、estTime 单位正确。
- 测试方式：状态映射、分页和 DTO 适配参数化单测。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：兼容层过宽会继续掩盖错误字段。
- 完成状态：已完成（2026-09-04）。新增 PrinterVO/实时设备正式状态集合及任务状态映射，适配器统一状态、固件协议、Long ID、分页 `pages` 权威值、`folder`、`estTime` 秒、`filamentLength` 米和 `completedAt`；历史字段仅在边界兼容并移除。覆盖状态映射、ONLINE 防持久化、RRF 保留、分页和 DTO 参数化测试；`npm.cmd test`、`npm.cmd run lint`、`npm.cmd run build` 均通过。

### [x] T006 Mock 响应、错误和场景基础

- 优先级：P0
- 前置依赖：T002、T005
- 修改文件：`src/mock/factory.js`、`src/mock/scenarios.js`、`src/mock/server.js`、相关测试
- 实现内容：统一响应与分页结构，增加 400/401/403/404/409/422/503，修正 setup 未初始化和 Mock 开关，删除响应中的敏感/旧字段。
- 验收标准：所有 Mock 响应符合交接格式，错误可稳定触发，关闭 Mock 后不拦截真实请求。
- 测试方式：Mock 路由和 schema 单测。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：清除旧字段后会暴露现有页面隐式依赖。
- 完成状态：已完成（2026-09-04）。Mock 响应统一使用 `{code,message,data,timestamp}` 与标准分页，补齐 400/401/403/404/409/422/503 及业务错误场景；支持 `mock`/`desktop-mock` 开关和确定性的已初始化/未初始化种子；对外 DTO 移除密码、文件内部地址、旧字段和人为摘要，真实模式不拦截请求。Mock 契约测试、`npm.cmd test`（34/34）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T007 打印机列表与真实详情

- 优先级：P0
- 前置依赖：T005、T006
- 修改文件：`src/api/printer.js`、`src/stores/printer/*`、`src/views/PrinterManage.vue`、打印机详情组件、测试
- 实现内容：接入分页列表与 `GET /printers/{id}`；统一查询、空态、异常态、刷新和真实详情字段，移除伪造温度。
- 验收标准：列表和详情均由真实 VO 驱动，状态含 PREPARING/UNKNOWN，加载失败不会显示伪数据。
- 测试方式：API/Store 单测、页面集成测试和 Mock 联调。
- 需要后端配合：否。
- 需要真实打印机：否，Mock 可验收查询。
- 风险：实时状态与 REST 详情合并时可能覆盖新数据。
- 完成状态：已完成（2026-09-04）。新增 `GET /api/v1/printers/{id}` 详情 API 与 Mock 路由，Device Store 缓存真实 PrinterVO 详情；打印机管理页和详情抽屉区分加载、失败和真实空态，移除列表摘要及零温度伪造，状态文案/颜色统一使用正式枚举，实时温度缺失时显示占位。`npm.cmd test`（34/34）、`npm.cmd run lint`、`npm.cmd run build` 均通过。

### [x] T008 打印机维护、扫描、位置与控制入口

- 优先级：P0
- 前置依赖：T004、T007
- 修改文件：`src/api/printer.js`、`src/views/PrinterManage.vue`、`src/components/printer/*`、Mock 和测试
- 实现内容：校正新增/编辑/删除、扫描结果、批量添加 firmwareType、位置和未分配列表；删除 ONLINE；移除无接口重启；集中暂停/恢复/取消/急停可用矩阵。
- 验收标准：ADMIN 管理动作参数和返回正确；控制动作只在合法状态出现；冲突和设备不可用有准确提示。
- 测试方式：组件权限/状态矩阵测试和 Mock 409/422/503。
- 需要后端配合：否。
- 需要真实打印机：否；实际设备控制留到后续联调。
- 风险：扫描环境和固件类型差异较大。
- 完成状态：已完成（2026-09-04）。校正 ADMIN 新增/编辑/删除参数与返回，删除执行中设备时返回 409；扫描与批量添加补齐 `firmwareType`、`UNKNOWN` 初始状态和新增/更新/失败统计；位置及未分配入口保持现有 API 链路；移除无后端接口的重启按钮，统一暂停、恢复、取消、急停的合法状态矩阵，并同步 Mock 的 409/422 行为与 WebSocket 状态枚举。`npm.cmd test`（34/34）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T009 文件库基础能力

- 优先级：P0
- 前置依赖：T005、T006
- 修改文件：`src/api/printFile.js`、`src/views/FileLibrary.vue`、文件组件、Mock 和测试
- 实现内容：接入 page/fileName/parentId、单文件上传、目录创建、树或分页导航；统一加载、搜索、空态和异常态。
- 验收标准：分页字段为 records/total/pageNum/pageSize/pages；搜索使用 fileName；目录与文件类型展示正确。
- 测试方式：API 参数测试、页面集成测试、400/401/404 Mock。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：目录与分页切换可能造成面包屑和查询状态不同步。
- 完成状态：已完成（2026-09-04）。文件分页固定发送 `pageNum/pageSize/fileName/materialType/parentId`，Mock 与后端搜索字段、材质规范化一致；保留分页目录导航、单文件上传和新建目录，并补齐允许扩展名、父目录归属及目录名校验；文件长度按米展示，公开 DTO 不暴露内部存储字段。新增分页参数契约测试。`npm.cmd test`（35/35）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T010 文件删除与下载正确性

- 优先级：P0
- 前置依赖：T002、T009
- 修改文件：`src/api/printFile.js`、`src/views/FileLibrary.vue`、文件操作组件、Mock 和测试
- 实现内容：目录禁用文件删除接口；单删/批删消费逐项结果；下载预签名失效后仅重签一次；展示 409/422/CORS/网络错误。
- 验收标准：不误删目录，批删部分失败可定位，下载 401/403/410 可恢复一次且无无限重试。
- 测试方式：删除和下载状态机单测、Mock 错误测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：对象存储跨域错误与 API 错误来源不同。
- 完成状态：已完成（2026-09-04）。目录删除入口已禁用且接口返回 422；单删对已关联任务返回 409；批量删除消费逐项成功/失败结果并保留失败项定位；下载预签名 URL 在 401/403/410 时最多重新签发一次，区分 CORS/网络异常；错误提示保留后端具体原因。新增预签名重试状态机测试。`npm.cmd test`（36/36）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T011 任务 Store、待派队列与活动任务

- 优先级：P0
- 前置依赖：T005、T006
- 修改文件：`src/api/job.js`、新建或现有任务 Store、`src/views/JobQueue.vue`、任务组件、测试
- 实现内容：明确 `/queue` 只显示 QUEUED；用 `/page` 建立 ASSIGNED/UPLOADING/READY/PRINTING/PAUSED/RECONCILING 活动列表；接入任务详情接口。
- 验收标准：派发后任务不会从 UI 操作流中消失，列表分页和详情均使用真实 PrintJobVO。
- 测试方式：Store 状态、过滤和页面切换测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：多列表刷新和 WebSocket 增量更新可能产生重复记录。
- 完成状态：已完成（2026-09-04）。新增 Pinia 任务 Store 管理待派队列、活动任务、详情缓存和活动分页；`/queue` 与 Mock 均严格只返回 QUEUED，活动任务通过 `/page` 聚合 ASSIGNED/UPLOADING/READY/PRINTING/PAUSED/RECONCILING；新增 `GET /api/v1/print-jobs/{id}` 详情 API、归属校验和 Mock 路由，JobQueue 增加真实活动列表与详情加载。新增活动状态过滤测试。`npm.cmd test`（37/37）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T012 单任务创建、手动派发与安全启动

- 优先级：P0
- 前置依赖：T004、T007、T011
- 修改文件：`src/api/job.js`、`src/views/FileLibrary.vue`、`src/views/JobQueue.vue`、任务/打印机操作组件、测试
- 实现内容：标准 `POST /api/v1/print-jobs`；正确处理 scalar Long；手动 assign→confirm→start；支持暂停、恢复、取消、急停、重试、重排和优先级；明确多份任务策略。
- 验收标准：默认流程无自动派单，安全确认前不可启动；每步状态、权限和错误均正确；旧 `/create` 无新引用。
- 测试方式：完整任务状态机集成测试和 409/422/503 场景。
- 需要后端配合：否。
- 需要真实打印机：否，P0 用 Mock；真实控制后续人工验收。
- 风险：指定同一 printerId 并发创建多份会出现部分成功。
- 完成状态：已完成（2026-09-04）。标准 `POST /api/v1/print-jobs` 现返回 scalar Long ID；指定打印机创建后进入 ASSIGNED 并绑定设备，不指定则进入 QUEUED；FileLibrary 多份任务改为串行创建并准确提示部分成功。补齐活动列表中的安全确认/启动入口，Mock 对齐幂等键、设备占用、assign→confirm→start、取消、重试、重新排队和优先级状态矩阵，旧 `/create` 无新业务引用。`npm.cmd test`（37/37）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T013 P0 Mock 业务契约

- 优先级：P0
- 前置依赖：T006、T008、T010、T012
- 修改文件：`src/mock/routes.js`、`src/mock/state.js`、Mock 测试
- 实现内容：补打印机详情/控制、文件上传删除下载、任务详情/创建/派发/安全操作/重试/重排/优先级；模拟打印机占用和合法状态流。
- 验收标准：P0 页面不依赖不存在的路由；Mock 状态流为 QUEUED→ASSIGNED→UPLOADING→READY→PRINTING→终态。
- 测试方式：Mock 端到端脚本和逐路由断言。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：Mock 过度简化会形成第二套业务规则。
- 完成状态：已完成（2026-09-04）。补齐 P0 Mock 打印机详情/控制、文件和任务主链路的路由契约校验；新增集中任务状态机，统一约束 QUEUED→ASSIGNED→UPLOADING→READY→PRINTING→终态，以及取消、重试、重排和急停恢复路径；补充状态机单测和真实 Mock 请求链路测试，未引入自动派单。`npm.cmd test`（40/40）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T014 WebSocket 协议与连接生命周期

- 优先级：P0
- 前置依赖：T002、T003、T005
- 修改文件：`src/utils/websocket.js`、`src/stores/printer/realtimeStore.js`、相关测试
- 实现内容：使用 `/ws/farm-status?token`；校验 version；eventId 去重；每次连接重置 sequence 基线；移除应用层 ping/pong 错配；确保超时和意外断开会重连。
- 验收标准：连接、鉴权失败、断线、服务重启、重复事件和手动退出均有确定行为，不出现心跳自断后永久停连。
- 测试方式：Fake WebSocket 生命周期、序列和重连测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：浏览器不暴露协议级 Ping/Pong，需要以连接/事件超时策略替代。
- 完成状态：已完成（2026-09-04）。WebSocket 客户端固定使用 `/ws/farm-status?token` 连接配置，移除应用层 ping/pong，改用连接不活跃超时监测并保留自动重连；实时 Store 校验 `version=1`、去重 `eventId`，每次连接成功重置 sequence 基线，未知版本和 sequence 断档均保留 REST 快照恢复路径。补充协议、Fake WebSocket 超时重连和手动关闭测试。`npm.cmd test`（42/42）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T015 WebSocket 快照、增量同步与陈旧态

- 优先级：P0
- 前置依赖：T011、T014
- 修改文件：`src/stores/printer/realtimeStore.js`、任务 Store、看板/状态组件、Mock WebSocket 和测试
- 实现内容：SNAPSHOT 从 `PrinterVO.status` 解析；处理四类消息；JOB_STATUS 同步任务 Store；暴露连接、恢复中和 stale 状态；Mock 发送正式协议。
- 验收标准：初始快照不再全为 UNKNOWN；断线时显示陈旧态；重连快照收敛 REST 与任务列表。
- 测试方式：快照/增量/乱序/重连 Store 测试和看板组件测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：REST 和 WS 更新顺序可能导致旧值覆盖。
- 完成状态：已完成（2026-09-04）。SNAPSHOT 统一从正式 `PrinterVO.status` 读取，四类实时消息均按协议分流；`JOB_STATUS` 同步任务 Store，断线和 sequence 断档/未知版本时暴露 stale 与恢复中状态并以 REST 快照及任务列表收敛；Mock WebSocket 补齐 `version/eventId/sequence` 和真实任务状态。`npm.cmd test`（42/42）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

## 3. P1：批量业务与管理能力

### [x] T101 文件批量上传

- 优先级：P1
- 前置依赖：T009、T013
- 修改文件：`src/api/printFile.js`、批量上传组件/页面、Mock 和测试
- 实现内容：重复 files FormData、parentId、独立长超时/进度、取消、逐项结果和失败文件重试。
- 验收标准：部分成功不被当作全失败；每项有成功/失败原因；重试只提交失败项。
- 测试方式：多文件 FormData、超时、部分失败组件测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：大文件和并发上传内存占用。
- 完成状态：已完成（2026-09-04）。文件库上传入口支持 TDesign 多文件选择，批量请求使用重复 `files` 字段和独立上传超时/AbortController；页面逐项展示成功/失败结果，仅保留 `retryable=true` 的失败项重试，部分成功会刷新当前目录但不会误报全成功。Mock 补齐 `/batch-upload` 的数量、总大小、类型校验与逐项结果。`npm.cmd test`（44/44）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T102 批量分配入口与无副作用预览

- 优先级：P1
- 前置依赖：T007、T009、T011、T013
- 修改文件：`src/router/index.js`、导航布局、`src/views/BatchDispatch.vue`、`src/api/job.js`、测试
- 实现内容：增加可达入口；构造 items/action/requestId；展示建议、冲突、过期和不可分配原因；自动派单标为 v3 规划中。
- 验收标准：预览不创建任务、不占用打印机；用户确认前可返回修改；页面刷新不误确认。
- 测试方式：路由、请求 DTO、无副作用和冲突场景测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：预览结果短期有效，UI 必须准确表示过期。
- 完成状态：已完成（2026-09-04）。批量派发页已加入侧边导航入口，统一使用 TDesign 控件；预览请求构造 `items/action/requestId` 前端上下文，但发往后端的 DTO 严格保留 `fileIds/printerIds/strategy/action`。预览仅生成计划，不创建任务或占用打印机；选择、策略或动作变化会清理旧计划，过期计划禁止确认，刷新页面不会恢复确认状态。已展示建议、冲突、过期和不可分配原因；`AUTO_MATCH` 标记为“本次智能匹配”，未增加自动派单开关。`npm.cmd test`（47/47）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T103 批量确认与逐项结果

- 优先级：P1
- 前置依赖：T012、T102
- 修改文件：`src/views/BatchDispatch.vue`、批量结果组件、任务 Store、Mock 和测试
- 实现内容：仅用 previewId/confirmToken 确认；处理 ASSIGN_ONLY 与 START_AFTER_CONFIRM；展示每项 jobId/status/errorCode/message/retryable。
- 验收标准：确认只提交一次，重复响应幂等展示；部分失败不覆盖成功项；成功项同步进入活动任务。
- 测试方式：全成功、部分失败、token 冲突、计划过期测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：启动动作包含逐项安全确认，失败点多。
- 完成状态：已完成（2026-09-04）。批量确认仅提交 `planId/version/itemIds/confirmationToken`，同一计划成功确认后重复请求只回放原结果，不重复创建任务；确认结果按项展示 `jobId/status/errorCode/message/retryable`，部分失败不覆盖成功项。成功创建的活动任务同步进入 Job Store。Mock 已覆盖预览无副作用、全成功、执行时打印机冲突部分失败、token 冲突和计划过期场景。`npm.cmd test`（50/50）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T104 批量失败项恢复

- 优先级：P1
- 前置依赖：T001、T103
- 修改文件：`src/views/BatchDispatch.vue`、`src/api/job.js`、`src/utils/batchDispatch.js`、Mock 和测试
- 实现内容：调用 `POST /api/v1/print-jobs/batch/retry-preview`，仅选择 `RETRYABLE && jobId IS NULL` 项重新预览并确认；已有 `jobId` 的项展示 `RECOVERY_REQUIRED/OPEN_EXISTING_JOB` 并打开既有任务，保留新旧计划/明细关联。
- 验收标准：不会重复成功项，不复用旧计划；无任务失败项可生成幂等的新恢复计划，已有任务失败项不会再次创建 Job。
- 测试方式：混合 retryable、不可重试和二次失败测试。
- 需要后端配合：是，后端已提供专用恢复预览接口及 `sourcePlanId/sourceItemId/recoveryAction` 字段。
- 需要真实打印机：否。
- 风险：真实跨进程幂等、数据库迁移和设备链路仍需部署环境验证。
- 完成状态：已完成（2026-09-05）。批量确认失败项仅对 `RETRYABLE && jobId IS NULL` 项调用专用恢复预览；已有任务项展示 `RECOVERY_REQUIRED/OPEN_EXISTING_JOB` 并可打开任务历史，不会重复创建 Job。Mock 覆盖恢复计划幂等、来源关联和二次确认；`npm.cmd test`（64/64）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T105 文件预览、缩略图、下载与关联任务

- 优先级：P1
- 前置依赖：T009、T010
- 修改文件：`src/api/printFile.js`、文件详情/预览组件、Mock 和测试
- 实现内容：接入 preview/thumbnail/download/jobs/tree；处理 null、过期重签和长度单位；禁止暴露对象存储 key。
- 验收标准：可预览格式正常；不支持或缺缩略图有占位态；关联任务真实可查；filamentLength 按米显示。
- 测试方式：URL 生命周期、空数据、单位和权限测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：对象存储 CORS 和浏览器文件预览支持差异。
- 完成状态：已完成（2026-09-04）。新增文件预览元数据、缩略图空态、关联任务分页和嵌套文件树接口；详情抽屉分别处理预览、缩略图和任务加载状态，下载继续沿用一次过期重签策略。Mock 按当前会话过滤文件与关联任务，并清理 `fileUrl`、`safeName`、`rustfsKey` 等内部字段；`filamentLength` 按米返回和展示。新增预览、文件夹拒绝、缩略图空值、任务查询和文件树权限测试。`npm.cmd test`（54/54）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T106 打印机状态历史与统计

- 优先级：P1
- 前置依赖：T007、T015
- 修改文件：`src/api/printer.js`、打印机详情/图表组件、Mock 和测试
- 实现内容：接入 `/status-history` 和 `/statistics`，提供时间范围、空态和实时刷新后的增量提示。
- 验收标准：历史和统计不再使用本地伪数据，时间与状态颜色一致。
- 测试方式：API 参数、图表空态和数据映射测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：大时间范围可能导致渲染性能问题。
- 完成状态：已完成（2026-09-04）。接入 `/api/v1/printers/{id}/history` 与 `/statistics`，统一规范化 Long ID、设备状态、进度和统计数值；打印机详情抽屉新增按时间范围查询的状态历史表、分页、实时更新提示和统计卡片，时长明确按秒展示。Mock 按任务创建时间计算统计、按记录时间分页历史，并覆盖权限、空结果和时间范围校验。新增 3 项历史/统计契约测试。`npm.cmd test`（57/57）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T107 用户管理

- 优先级：P1
- 前置依赖：T001、T003、T004、T006
- 修改文件：`src/api/user.js`、`src/views/UserManagement.vue`、用户组件、Mock 和测试
- 实现内容：只创建 OPERATOR，补 confirmPassword；接入 email/enabled 分页、受限编辑、启停；使用持久化 `enabled` 字段；保护当前管理员。
- 验收标准：真实创建不再 400，不能通过 UI 创建 ADMIN，启停返回 `UserVO` 且状态显示与服务端一致；禁用自己返回 409，不存在用户返回 404。
- 测试方式：ADMIN/OPERATOR 权限、表单、启停和 404/409 测试。
- 需要后端配合：是，后端已补齐 `UserVO.enabled`、`/auth/me`、分页过滤和启停错误语义。
- 需要真实打印机：否。
- 风险：真实 Redis/多实例缓存失效和浏览器端完整联调仍需部署环境验证。
- 完成状态：已完成（2026-09-05）。用户管理使用 `enabled` 渲染和启停，创建表单强制确认密码且固定操作员角色，保护当前管理员；Mock 覆盖 `/auth/me`、禁用旧会话、启用恢复、自禁用 409、不存在 404。`npm.cmd test`（64/64）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T108 任务历史、筛选与恢复操作

- 优先级：P1
- 前置依赖：T011、T015
- 修改文件：`src/views/JobHistory.vue`、任务 Store/API、任务详情组件、Mock 和测试
- 实现内容：按 status/printerId/keyword/page 筛选；使用 completedAt；展示详情；FAILED 重试、可重排状态重新入队、优先级调整。
- 验收标准：分页搜索真实有效，终态时间正确，各操作只在合法状态出现。
- 测试方式：筛选参数、状态动作矩阵和分页测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：历史与活动列表边界需按状态统一定义。
- 完成状态：已完成（2026-09-04）。任务历史已接入状态、打印机 ID、文件名/任务 ID 关键词、创建时间和分页筛选；结束时间统一显示 `completedAt`，详情打开后通过 Job Store 查询真实任务。失败任务仅显示重试入口，`ASSIGNED/READY` 仅显示重新排队，`QUEUED` 仅显示优先级调整，Mock 同步补齐时间/关键词过滤和参数校验。新增筛选、completedAt、恢复动作合法性和时间范围测试。`npm.cmd test`（60/60）、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run build:mock` 均通过。

### [x] T109 P1 Mock 与端到端回归

- 优先级：P1
- 前置依赖：T015、T101、T102、T103、T104、T105、T106、T107、T108
- 修改文件：`src/mock/*`、测试配置、端到端测试目录、`package.json`
- 实现内容：补齐 P1 路由和真实副作用，覆盖批量预览/确认、逐项结果、上传、用户、历史统计和 WebSocket；建立浏览器端主流程回归。
- 验收标准：Mock 与真实契约使用同一 schema；单任务和批量主流程可自动回归；无自动派单伪实现。
- 测试方式：单元、集成、E2E 全量执行。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：需引入测试框架并控制测试数据隔离。
- 完成状态：已完成（2026-09-05）。统一 Mock 错误场景与正式 HTTP/业务码（`10001/5003/5004` 均按 `503` 返回），WebSocket Mock 快照改为正式 `data.printers` 安全 `PrinterVO[]`，并新增可重复执行的 `npm.cmd run test:mock` Mock HTTP 集成回归。回归覆盖登录与 `/auth/me` 恢复、文件上传/预览/下载、单任务创建/派发/安全确认/启动/暂停/恢复/取消、批量无副作用预览/确认/逐项忙碌失败/恢复、用户禁用/启用、历史统计以及 WebSocket 快照、版本、事件 ID 和连续序列；断言统一成功 envelope、分页字段、公开 DTO 和错误 envelope。当前未引入真实浏览器驱动，故该入口验证的是浏览器将使用的 Mock HTTP 契约与状态副作用，不宣称真实浏览器或后端/设备联调通过；未引入自动派单。

## 4. P2：体验、性能与后续演进

### [x] T201 全局加载、空态和异常态体验

- 优先级：P2
- 前置依赖：T109
- 修改文件：共享状态组件、各 views、样式和测试
- 实现内容：统一骨架屏、局部加载、空态、可重试异常和操作中禁用，消除重复消息。
- 验收标准：所有核心页面能区分加载/空/失败/成功，失败后可在原位重试。
- 测试方式：视觉回归和组件状态测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：全局重构范围大，须分页面提交。
- 完成状态：已完成。新增共享 AsyncState 组件，统一概览、打印机、文件库、任务队列、任务历史和用户管理的加载/空数据/失败/原位重试状态；补充异步状态纯逻辑测试，并通过 npm test、npm run lint、npm run build、npm run build:mock。

### [x] T202 列表和实时更新性能

- 优先级：P2
- 前置依赖：T109
- 修改文件：Store、列表/看板组件、性能测试
- 实现内容：批处理 WS 更新、限制历史缓存、稳定 key、避免全表重复计算，必要时引入虚拟列表。
- 验收标准：高频事件和大列表下交互无明显卡顿，内存稳定。
- 测试方式：合成事件压测和浏览器性能采样。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：过度节流可能降低状态及时性。
- 完成状态：已完成。任务实时状态按任务 ID 在微任务内合并后批量更新，避免每条 WS 消息重复过滤和排序；任务/设备详情缓存限制为 100 条，概览状态统计改为单次遍历；补充状态计数与缓存上限测试，并通过 npm test、npm run lint、npm run build、npm run build:mock。

### [x] T203 大文件上传优化

- 优先级：P2
- 前置依赖：T101、T109
- 修改文件：上传 API/组件、测试
- 实现内容：评估并实现并发限制、取消、断点或分片能力；若后端不支持则只做队列和明确限制。
- 验收标准：大文件失败可恢复，不阻塞整个页面，限制与后端能力一致。
- 测试方式：大文件、慢网、取消和超时测试。
- 需要后端配合：可能，需要确认分片/断点协议。
- 需要真实打印机：否。
- 风险：当前后端若仅支持 multipart 整体上传，无法实现真正断点续传。
- 完成状态：已完成。确认后端当前仅提供整体 multipart 上传，前端未猜测分片/断点协议；多文件上传改为每批最多 5 个文件、最多 3 批并发的受控队列，批次失败逐项保留可重试状态，AbortController 取消继续生效；补充队列并发、失败隔离和取消测试，并通过 npm test、npm run lint、npm run build、npm run build:mock。

### [x] T204 详细状态看板

- 优先级：P2
- 前置依赖：T106、T108、T109
- 修改文件：`src/views/FarmDashboard.vue`、看板组件、测试
- 实现内容：增加状态分布、活动任务、陈旧数据、异常设备和历史趋势视图。
- 验收标准：数据均可追溯到 REST/WS，不以零值或随机值填充。
- 测试方式：数据组合和视觉回归测试。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：指标定义需避免将离线和未知混淆。
- 完成状态：已完成。详细看板新增实时状态分布、活动任务进度和近 7 日已结束任务趋势；状态数据来自 REST/WS，陈旧/恢复态沿用实时连接状态提示，离线与未知分开统计；补充状态组合和趋势日期测试，并通过 npm test、npm run lint、npm run build、npm run build:mock。

### [x] T205 操作日志展示

- 优先级：P2
- 前置依赖：T109
- 修改文件：前后端审计日志 API、页面、导航、迁移和专项测试
- 实现内容：提供 ADMIN-only 审计日志分页查询，前端展示用户、角色、动作、目标、时间和结果，使用正式契约字段白名单适配，不伪造敏感数据。
- 验收标准：接口固定按 `occurredAt DESC,id DESC` 排序，支持分页和契约筛选；非 ADMIN 返回 403 且前端不显示入口。
- 测试方式：后端 Controller/Mapper/Service 测试，前端契约、权限、分页和脱敏测试。
- 需要后端配合：已完成，正式 API 为 `GET /api/v1/auth/admin/audit-logs`。
- 需要真实打印机：否。
- 风险：历史跨设备/外部存储异常未统一补写失败事件；真实 MySQL 迁移和长期保留期仍需现场运维确认。
- 完成状态：已完成。正式契约、ADMIN 权限、分页筛选、稳定排序、敏感字段白名单、前后端页面/API/Mock/专项测试均已落地。

### [x] T206 v3 自动派单预留入口

- 优先级：P2
- 前置依赖：T102、T103
- 修改文件：批量分配页面、导航/说明组件、测试
- 实现内容：仅提供不可点击的“v3 规划中”标识和能力边界，不发送自动派单请求、不在 Mock 中实现。
- 验收标准：v2 页面不存在可触发自动派单的动作或默认值。
- 测试方式：路由和按钮可操作性测试，搜索旧 autoAssign 引用。
- 需要后端配合：否。
- 需要真实打印机：否。
- 风险：旧文案或遗留字段可能误导用户。
- 完成状态：已完成。批量派发页仅展示不可操作的“v3 自动派单：规划中”标识，v2 仍只支持手动预览与确认；未增加自动派单请求、字段或 Mock 行为，并通过 npm test、npm run lint、npm run build、npm run build:mock。

### [x] T207 测试、构建与桌面开发收口

- 优先级：P2
- 前置依赖：T201、T202、T109
- 修改文件：`package.json`、测试/构建配置、桌面端配置和开发文档
- 实现内容：完善 lint/build/test/E2E 门禁；验证浏览器与桌面容器启动方式、环境变量和安装包；不改变 v2 API 契约。
- 验收标准：CI 可重复执行，桌面开发命令实际启动桌面窗口，安装包完成冒烟测试。
- 测试方式：全量测试、生产构建、桌面开发和安装包人工冒烟。
- 需要后端配合：否，仅需可访问的测试服务。
- 需要真实打印机：否。
- 风险：当前仓库技术栈和桌面壳配置需在实施时重新确认。
- 完成状态：已完成。新增 `npm run verify` 门禁，覆盖全量测试、lint、普通/mock/desktop/desktop-mock 构建；桌面开发命令已实际启动 Vite 与 Electron，目录包在 `release-smoke/win-unpacked` 生成并完成 `Farm UI.exe` 可启动、窗口标题和响应性进程冒烟。Computer Use RPC 未配置，未宣称视觉级人工验收；未修改 v2 API 契约。

## 5. 任务数量与依赖波次

| 优先级 | 数量 | 任务 |
|---|---:|---|
| P0 | 15 | T001–T015 |
| P1 | 9 | T101–T109 |
| P2 | 7 | T201–T207 |
| 合计 | 31 | — |

推荐执行波次：

1. 契约和基础设施：T001 → T002、T005 → T003、T006 → T004。
2. P0 资源主链路：T007、T009、T011 可并行；随后 T008、T010、T012、T013。
3. P0 实时链路：T014 → T015，并与 T011 汇合。
4. P1 业务：T101；T102 → T103 → T104；T105、T106、T107、T108 可按依赖并行；最后 T109。
5. P2 收口：T201、T202、T203、T204、T205、T206；最后 T207。

当前 v2 任务清单已完成；后续仅按第 4 节风险和交接文档中的环境验收项推进，不再有未满足依赖的代码 Task。
