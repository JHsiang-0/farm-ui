/**
 * 可重复触发的 Mock 错误场景。
 * key 可通过 query.mockError 或 X-Mock-Error 传入。
 */
export const MOCK_ERROR_SCENARIOS = Object.freeze({
  '400': Object.freeze({ status: 400, code: 400, message: '模拟参数错误' }),
  '401': Object.freeze({ status: 401, code: 401, message: '模拟未登录' }),
  '403': Object.freeze({ status: 403, code: 403, message: '模拟无权限' }),
  '404': Object.freeze({ status: 404, code: 404, message: '模拟资源不存在' }),
  '409': Object.freeze({ status: 409, code: 409, message: '模拟资源冲突' }),
  '422': Object.freeze({ status: 422, code: 422, message: '模拟业务校验失败' }),
  '503': Object.freeze({ status: 503, code: 503, message: '模拟服务维护中' }),
  '10001': Object.freeze({ status: 503, code: 10001, message: '模拟打印机离线或设备不可用' }),
  '10002': Object.freeze({ status: 409, code: 10002, message: '模拟设备忙碌' }),
  '5003': Object.freeze({ status: 503, code: 5003, message: '模拟文件存储服务不可用' }),
  '5004': Object.freeze({ status: 503, code: 5004, message: '模拟设备网络异常' })
})

const getHeader = (headers, name) => {
  if (!headers) return ''
  return headers[name] || headers[name.toLowerCase()] || ''
}

export const getMockErrorScenario = config => {
  const value = config?.params?.mockError || getHeader(config?.headers, 'X-Mock-Error')
  return String(value || '').trim()
}

export const resolveMockErrorScenario = config => MOCK_ERROR_SCENARIOS[getMockErrorScenario(config)] || null
