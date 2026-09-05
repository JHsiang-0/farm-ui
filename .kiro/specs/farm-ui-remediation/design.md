# FabMatrix 独立前端 UI 整改设计

版本：v1.0  
对应需求：.kiro/specs/farm-ui-remediation/requirements.md  
视觉基线：FRONTEND_UI_SPECIFICATION.md

## 1. 设计原则

TDesign Vue Next 是业务页面的组件和视觉基础。页面不通过大量自定义 CSS 模拟另一套设计系统。

| 场景 | TDesign 组件 |
| --- | --- |
| 应用框架 | Layout、Aside、Header、Content |
| 导航 | Menu、Breadcrumb、Dropdown |
| 页面结构 | Card、Space、Divider |
| 表格 | Table、Pagination |
| 表单 | Form、Input、Select、DatePicker、Upload |
| 反馈 | Loading、Skeleton、Empty、Alert、Result |
| 状态 | Tag、Badge、Progress |
| 详情 | Drawer、Descriptions、Statistic、Tabs |
| 确认 | Dialog、Popconfirm |
| 工作流 | Steps |

## 2. 数据流设计

OpenAPI/API_HANDOFF → src/api 参数和响应适配 → Pinia Store/Selector → 页面 View Model → TDesign Component。

页面不直接使用 Axios，不自行解包统一响应，不在模板中判断大量原始枚举。

## 3. 应用壳设计

### 3.1 尺寸

| Token | 值 | 用途 |
| --- | ---: | --- |
| app sidebar width | 232px | 桌面 Sidebar |
| app sidebar collapsed width | 64px | 折叠 Sidebar |
| app header height | 64px | 桌面 Header |
| app content padding | 24px | 桌面 Content |
| app mobile padding | 16px | 窄屏 Content |
| app content max width | 1600px | 内容最大宽度 |

通过项目语义 token 或 TDesign token 管理，不在业务页面重复硬编码。

### 3.2 页面骨架

App Layout → Sidebar → Main Layout → Header → Content → Breadcrumb（可选）→ Route View。

页面组件使用 Page Header、Query Toolbar 和 Data Region 三段结构。Page Card 只用于有独立内容生命周期的区域，不能用于填充页面剩余高度。

### 3.3 滚动

- App Shell 负责布局高度。
- 页面内容默认自然增长。
- Table、目录树、Drawer Body 是允许局部滚动的区域。
- 每个局部区域只有一个滚动容器。
- 分页位于表格滚动区域之外。

## 4. 公共页面模式

### Page Header

标题、说明、主操作和次操作只出现一套。重复标题必须删除或改为区域说明。

### Query Toolbar

查询字段位于左侧，查询、重置、刷新位于右侧。桌面使用 inline Form，窄屏换行或抽屉化。字段名、默认值和空值语义由 src/api 决定。

### Data Region

默认结构为 Page Header → Query Toolbar → Table → Pagination。不得用整页 Card、空白伸展和绝对定位 Table 作为默认模式。

### Status View Model

状态适配器统一输出 code、label、theme、icon、description。模板只使用适配后的结果，不直接显示后端枚举。

## 5. 页面设计

### 5.1 服务器连接

页面结构：协议、IP/Host、端口、地址预览、测试、保存并连接。

测试只验证连接；保存并连接才持久化并进入认证流程。没有后端发现协议时，不展示伪造的局域网服务器搜索结果。

### 5.2 打印机管理

页面结构：Page Header、搜索和状态 Toolbar、核心字段 Table、详情 Drawer。

列表核心字段为 ID、名称、机器编号、IP、状态、协议、当前任务和操作。热床安全、耗材、喷嘴等低频信息进入详情。

静态详情来自正式详情接口，实时覆盖来自实时 Store。缺少实时值显示占位，不显示伪造零值。

### 5.3 文件库

页面结构：Page Header、目录上下文和 Toolbar、左侧目录树、右侧文件 Table 或 Grid、文件详情 Drawer。

默认以 Table 处理大量文件，Grid 作为用户选择。文件夹、文件、上传状态和批量操作要有不同的视觉层级。

### 5.4 任务中心

页面结构：Page Header、待派发任务和活动任务 Tabs、Toolbar、任务 Table、任务详情 Drawer。

历史作为独立页面，不与活动队列混用。只有实际有数据的区域才使用内容高度；空数据使用带行动建议的 Empty。

### 5.5 批量派发

Steps 只显示当前步骤工作区，已完成步骤保留摘要。当前步骤的主操作固定在明确位置，不能藏在首屏以下。

### 5.6 管理、日志和个人中心

用户管理、操作日志和个人中心使用自然内容高度，不以超大 Card 填满视口。日志动作通过文案适配器展示，原始枚举只作为开发信息保留。

## 6. 异步状态设计

页面状态：idle → loading → success(data)，success 还可以进入 success(empty) 或 error(retryable)。

刷新状态：success(data) → refreshing → success(newData)，失败时保留旧数据并标记 stale。

Drawer 先打开结构，再在 Body 内显示 detail loading、success、empty 或 error。标题不能依赖尚未返回的名称字段。

| 语义 | UI 表达 | 恢复动作 |
| --- | --- | --- |
| 401 | 会话失效提示 | 重新登录 |
| 403 | 无权限 Result/Alert | 返回可访问页面 |
| 404 | 资源不存在 | 返回列表或刷新 |
| 409 | 状态冲突 | 刷新后重试 |
| 422 | 表单或状态错误 | 修正输入或重新选择 |
| 503 | 服务不可用 | 重试并保留已有数据 |

## 7. CSS 和兼容层

- TDesign token 管理颜色、字体、组件尺寸和状态主题。
- 项目语义 token 管理品牌色、应用壳尺寸和页面间距。
- 页面 CSS 只处理必要的布局和数据密度。
- Tailwind 在迁移期间只保留少量辅助类。
- TdTable 只在现有列插槽无法安全迁移时使用。
- 涉及高度、overflow、绝对定位和 Loading 父级的修改必须单独做滚动验收。

## 8. 测试设计

浏览器测试使用真实用户点击、输入、Tab、Enter、Escape、分页、筛选、详情、上传和确认。

禁止使用 dispatchEvent 代替核心点击，禁止复制 DOM 行制造滚动数据，禁止在页面稳定前截图。

视口：375×812、768×1024、1024×768、1440×900、1920×855。

Electron 验收使用实际 Electron 壳和构建产物，检查窗口尺寸、缩放、滚动、快捷键、API/WebSocket 地址解析和主要业务流程。

