# Farm 前端设计

版本：v1.0
对应需求：`.kiro/specs/farm-frontend/requirements.md`

## 分层边界

```text
View/Component
      ↓
Pinia Store（跨页面状态）
      ↓
src/api（接口路径和响应适配）
      ↓
src/utils/request.js（鉴权、错误、重复请求锁）
      ↓
真实后端或 src/mock
```

- 页面不直接使用 Axios，不拼接鉴权 Header，不自行处理统一错误。
- API 模块负责请求参数、响应适配和 Long ID 字符串化。
- Store 负责登录态、设备状态和实时连接生命周期。
- `src/mock` 复刻当前接口、响应包装、权限和状态转换。

## 认证设计

`src/stores/user.js` 维护 `token` 和 `userInfo`，按“记住我”分别保存到 `localStorage` 或 `sessionStorage`。`src/utils/request.js` 自动注入 Bearer Token；401 统一登出并跳转登录页。

路由在 `meta.requiresAuth` 和 `meta.roles` 上声明访问要求。全局守卫先判断认证，再判断角色；权限不足时跳转到安全的默认页面并提示无权限。

布局通过同一份路由权限元数据过滤菜单，避免菜单规则和路由规则分叉。用户下拉菜单中的系统设置仍保留为明确的开发中状态，个人中心已接入真实路由。

个人中心使用 `/profile` 受保护路由，页面通过 `src/api/user.js` 的 `getProfile`、`updateProfile` 和 `changePassword` 访问当前用户接口。更新资料不提交 `role`，修改密码成功后保留当前 JWT；后端返回 401 时仍由请求层统一清理登录态。

## API 与 Mock 设计

- 任务创建正式方法调用 `POST /api/v1/print-jobs`。
- 旧 `/api/v1/print-jobs/create` 只在 `createPrintJobLegacy` 中保留。
- 任务队列和历史页面通过 API 模块调用 retry/requeue/priority；按钮只在后端允许的状态显示或启用，失败时重新拉取列表恢复服务端状态。
- 文件下载先请求预签名 URL，再使用 Blob 或该 URL 完成下载；不直接把下载接口地址交给浏览器。
- 文件列表和详情只使用后端 camelCase 契约；`folder` 是唯一目录标记。打开文件详情后调用 `GET /print-files/{id}/preview` 获取权威元数据，按需调用 `GET /print-files/{id}/thumbnail` 获取短期缩略图地址。
- 成功的空响应由调用方按空结果处理，不视为异常。
- 规划接口不在 API 模块中新增可调用方法，页面只显示占位或禁用入口。
- Mock 登录保留 `disabled` 用户名作为账号禁用演示场景，不记录或要求真实凭据。

## 实时状态设计

`printer` Store 拆分静态设备、实时状态和网格布局。WebSocket 由实时 Store 管理，连接、重连、注销和页面卸载都必须清理连接及定时器。REST 的静态配置不被单条实时消息覆盖。

正式协议使用 `/ws/farm-status`，消息按 `SNAPSHOT`、`PRINTER_STATUS`、`PRINTER_OFFLINE`、`JOB_STATUS` 分发；后端协议未完成前，Mock 提供同形状事件。

## 交互与安全设计

- 所有创建、删除、取消、急停和安全操作有 loading、重复提交锁和必要确认。
- 401/403/409/422/设备离线使用统一中文提示。
- 不在页面、日志、Mock 公共响应中暴露 API Key、对象存储内部 Key 或内部路径。
- 下载链接失效时提示重新获取；预签名 URL 跨域失败时只回退到已取得的预签名 URL。

## 验证设计

每个阶段提交前执行 `npm run lint`、`npm run build` 和 `git diff --check`。当前没有测试框架，后续在 P2 补充请求层、路由权限、状态按钮和 WebSocket 测试。
