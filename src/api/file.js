/**
 * 文件 API 兼容门面。
 *
 * 正式实现集中在 printFile.js 和 job.js，避免不同页面各自维护接口路径、
 * 下载流程和响应适配逻辑。新代码请直接从对应的正式模块导入。
 * @module api/file
 */

export {
  getFileList,
  uploadFile as uploadPrintFile,
  createFolder,
  deleteFile as deletePrintFile,
  deleteBatchFiles as deleteBatch,
  downloadFile as downloadPrintFile
} from './printFile'

export { createPrintJob } from './job'
