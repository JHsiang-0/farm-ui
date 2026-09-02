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

    const dialog = DialogPlugin.confirm({
      header: title,
      body: content,
      theme: options.type === 'danger' ? 'danger' : options.type === 'warning' ? 'warning' : 'default',
      confirmBtn: options.confirmButtonText || '确定',
      cancelBtn: options.cancelButtonText || '取消',
      onConfirm: () => settle(resolve),
      onCancel: () => settle(() => reject('cancel')),
      onClose: () => settle(() => reject('cancel'))
    })

    // 保证实例在回调执行后释放。
    if (dialog && typeof dialog.hide === 'function') {
      const hide = dialog.hide.bind(dialog)
      dialog.hide = () => {
        hide()
      }
    }
  })
}

export default message
