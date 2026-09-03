import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next'

/**
 * 统一消息提示，封装 TDesign 消息 API。
 */
export const message = MessagePlugin

/**
 * 显示确认对话框，并以 Promise 形式返回用户选择。
 * 保持业务代码原有的 await/then/catch 使用方式。
 */
export function confirmMessage(content, title = '提示', options = {}) {
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (callback) => {
      if (settled) return
      settled = true
      callback()
    }

    let dialog
    const closeDialog = (callback) => {
      // 传入自定义 onClose 后，TDesign 不再执行默认的隐藏逻辑。
      dialog?.hide?.()
      settle(callback)
    }

    dialog = DialogPlugin.confirm({
      header: title,
      body: content,
      theme: options.type === 'danger' ? 'danger' : options.type === 'warning' ? 'warning' : 'default',
      confirmBtn: options.confirmButtonText || '确定',
      cancelBtn: options.cancelButtonText || '取消',
      onConfirm: () => closeDialog(resolve),
      onCancel: () => closeDialog(() => reject('cancel')),
      onClose: () => closeDialog(() => reject('cancel'))
    })
  })
}

export default message
