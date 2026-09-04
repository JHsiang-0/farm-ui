import request from '@/utils/request'
import {
  mapResponseData,
  normalizePageParams,
  normalizePageResponse,
  normalizeUser
} from '@/utils/dataAdapters'

/**
 * 用户认证 API 模块
 * @module api/user
 */

/**
 * 用户登录
 * @param {Object} data - 登录参数
 * @param {string} data.username - 用户名
 * @param {string} data.password - 密码
 * @returns {Promise<{code: number, message: string, data: LoginResult}>} 登录结果
 */
export function login(data) {
  return request({
    url: '/api/v1/auth/login',
    method: 'post',
    data
  }).then(response => mapResponseData(response, normalizeUser))
}

/**
 * 查询首次管理员初始化状态。
 */
export function getFirstAdminSetupStatus() {
  return request({
    url: '/api/v1/auth/setup/status',
    method: 'get'
  })
}

/**
 * 创建 Local Edition 的首个管理员，成功后返回可直接使用的登录结果。
 */
export function setupFirstAdmin(data) {
  return request({
    url: '/api/v1/auth/setup/admin',
    method: 'post',
    data
  })
}

/**
 * 用户注册
 * @param {Object} data - 注册参数
 * @param {string} data.username - 用户名
 * @param {string} data.password - 密码
 * @param {string} [data.email] - 邮箱
 * @param {string} [data.phone] - 手机号
 * @returns {Promise<{code: number, message: string, data: string}>} 注册结果，data 为新用户 ID
 */
export function register(data) {
  return request({
    url: '/api/v1/auth/register',
    method: 'post',
    data
  }).then(response => mapResponseData(response, normalizeUser))
}

export function getAdminUsers(params = {}) {
  return request({
    url: '/api/v1/auth/admin/users',
    method: 'get',
    params: normalizePageParams(params)
  }).then(response => mapResponseData(response, data => normalizePageResponse(data, normalizeUser)))
}

export function createAdminUser(data) {
  return request({ url: '/api/v1/auth/admin/users', method: 'post', data })
}

export function updateAdminUser(userId, data) {
  return request({ url: `/api/v1/auth/admin/users/${userId}`, method: 'put', data })
}

export function setAdminUserEnabled(userId, enabled) {
  return request({
    url: `/api/v1/auth/admin/users/${userId}/${enabled ? 'enable' : 'disable'}`,
    method: 'post'
  })
}

export function getProfile(userId) {
  return request({ url: `/api/v1/auth/${userId}/profile`, method: 'get' })
    .then(response => mapResponseData(response, normalizeUser))
}

export function updateProfile(userId, data) {
  return request({ url: `/api/v1/auth/${userId}/profile`, method: 'put', data })
}

export function changePassword(userId, data) {
  return request({ url: `/api/v1/auth/${userId}/change-password`, method: 'post', data })
}

// ============================================
// Type Definitions (JSDoc)
// ============================================

/**
 * @typedef {Object} LoginResult
 * @property {string} token - Bearer Token
 * @property {number} expiresIn - 有效期（秒）
 * @property {string} userId - 用户ID
 * @property {string} username - 用户名
 * @property {string} role - 用户角色（ADMIN/OPERATOR）
 */

/**
 * @typedef {Object} UserInfo
 * @property {string} id - 用户ID
 * @property {string} username - 用户名
 * @property {string} [email] - 邮箱
 * @property {string} [phone] - 手机号
 * @property {string} [avatar] - 头像URL
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 */
