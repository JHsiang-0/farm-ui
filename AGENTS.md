# 项目协作说明

## 项目简介

本仓库是面向 3D 打印农场管理场景的 Vue 单页应用，提供登录、打印机管理、文件库、任务队列/历史和实时设备看板等页面。

## 技术栈

- Vue 3、JavaScript（ES Modules），Vite 7
- Vue Router 5
- Pinia 3、`pinia-plugin-persistedstate`
- Axios、TDesign Vue Next、`tdesign-icons-vue-next`
- Tailwind CSS 3、PostCSS、Autoprefixer
- ESLint 10、Vue ESLint、Oxlint、Prettier 3
- Node.js：`^20.19.0 || >=22.12.0`

项目未配置 TypeScript；当前也未发现自动化测试框架或测试目录。

## 目录结构

```text
D:\WorkSpace\Vue\Farm\
├─ AGENTS.md
├─ public/                     静态资源
├─ src/
│  ├─ api/                     用户、打印机、文件、任务等 API 模块
│  ├─ components/              看板、设备、文件、网格和图标组件
│  ├─ layout/                  页面布局
│  ├─ router/                  Vue Router 路由与登录守卫
│  ├─ stores/                  Pinia 状态；printer 下拆分设备、实时、网格状态
│  ├─ styles/                  全局与响应式样式
│  ├─ utils/                   Axios 请求、WebSocket、常量、格式化和 TDesign 交互适配工具
│  ├─ views/                   登录、打印机、文件、任务等页面
│  ├─ App.vue
│  └─ main.js
├─ index.html
├─ package.json / package-lock.json
├─ vite.config.js              Vite、别名、开发服务器和代理
├─ eslint.config.js            ESLint 配置
├─ jsconfig.json               `@/*` 路径别名
├─ tailwind.config.js
└─ postcss.config.js
```

界面组件统一使用 TDesign Vue Next；`TdTable.vue` 和 `TdTableColumn.vue` 是项目内部的表格兼容适配层，用于承接原有表格列插槽和行选择逻辑。

`src/stores/printerStore.js.backup` 是备份文件，除非明确需要，不应作为正式运行时代码修改或引用。

## 本地启动方式

在项目根目录执行：

```sh
npm install
npm run dev
```

开发服务器默认监听 `127.0.0.1:5173`。如需局域网访问，可设置 `VITE_HOST=true`。

## 构建和测试命令

```sh
npm run build       # 生产构建
npm run preview     # 预览构建产物
npm run lint        # 运行 Oxlint 和 ESLint（脚本会执行 --fix）
npm run format      # 格式化 src/
```

当前提供 `npm test`，使用 Node.js 内置测试运行器执行 `tests/` 下的测试文件。新增测试时应同步补充 `package.json` 命令和本文件说明。

## 代码规范

- 遵循现有 Vue 单文件组件结构、Composition API 和 JavaScript 风格；保持 2 空格缩进及现有换行/引号风格。
- 使用 TDesign Vue Next 的组件 API（例如 `theme`、`variant`、`v-model:visible`）；全局消息和确认框统一通过 `src/utils/message.js`，图标渲染优先复用 `src/utils/tdesign.js`。
- 组件放在 `src/components`，页面放在 `src/views`，通用逻辑放在 `src/utils`；使用 `@/` 引用 `src` 下模块。
- 路由集中维护于 `src/router/index.js`；共享状态使用 Pinia，不要在组件间复制全局状态。
- 后端调用统一通过 `src/utils/request.js` 的 Axios 实例，并在对应 `src/api` 模块新增方法；不要在组件中重复实现鉴权、错误提示或请求拦截。
- 实时设备状态通过 `src/utils/websocket.js` 和 printer 相关 Store 管理；修改连接生命周期时检查断线重连和清理逻辑。
- 提交或交付前至少执行 `npm run build`；涉及 JavaScript/Vue 时执行 `npm run lint`，并人工检查 lint 自动修复产生的改动。

## API 和环境变量

- Axios 基础 URL 为空，开发环境通过 Vite 代理转发 `/api` 和 `/ws`。
- API 模块位于 `src/api`，当前接口主要使用 `/api/v1/auth`、`/api/v1/printers`、`/api/v1/print-files`、`/api/v1/print-jobs`。
- 请求拦截器从持久化的 Pinia 用户 Store 读取 token，并发送 `Authorization: Bearer <token>`；响应按业务 `code` 处理，未授权会登出并跳转登录页。
- WebSocket 地址优先读取 `VITE_WS_URL`，否则根据当前页面地址推导；开发代理目标由 `VITE_WS_TARGET` 控制。
- Vite API 代理目标由 `VITE_API_TARGET` 控制，默认 `http://localhost:8080`；WebSocket 代理默认 `ws://localhost:8080`。
- Vite 只会将 `VITE_` 前缀变量暴露给前端。环境文件未随项目提供；新增环境变量时应更新文档，并避免写入真实凭据。

## 修改代码前的检查要求

后续每次开始任务前，必须按以下顺序执行：

1. 先读取本文件。
2. 扫描与任务相关的目录和文件。
3. 阅读相关源码、路由、Store、API 及配置文件。
4. 先向用户说明分析结果、影响范围和修改计划，再开始修改代码。

## 修改完成后的验证要求

- 检查变更是否只涉及任务范围，并确认没有误改备份文件、依赖锁文件或环境配置。
- 执行与变更相关的 lint/build 命令；若项目或环境限制导致无法执行，必须明确说明。
- 涉及路由、登录、请求、WebSocket、上传下载或设备控制时，重点检查错误处理、鉴权、资源清理和代理配置。
- 汇总实际执行的验证命令及结果，再交付修改。

## 安全要求

禁止提交密钥、密码、token、私钥、真实服务器凭据、生产环境配置或其他敏感信息。环境变量文件和本地调试凭据不得加入版本控制；如发现疑似敏感信息，应立即停止扩散并提醒处理。
