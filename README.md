# farm-ui

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
# Mock 开发模式

复制 `.env.example` 为本地环境文件并设置 `VITE_USE_MOCK=true`，即可在不依赖后端的情况下开发页面。

内置演示账号：

- ADMIN：`admin` / `Admin123`
- OPERATOR：`operator` / `Operator123`

以上账号仅用于本地 Mock，不得用于真实环境。开发者可在浏览器控制台执行 `window.__FARM_RESET_MOCK__()` 重置当前 Mock 数据。

Mock 错误演示可在请求参数中加入 `mockError=401`、`403`、`404`、`409`、`422`、`10001`、`10002`、`5003` 或 `5004`。
