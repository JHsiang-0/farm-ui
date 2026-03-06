import request from '@/utils/request'

/**
 * 用户认证 API 模块
 * @module api/user
 */

/**
 * 用户登录
 * @param {Object} data - 登录参数
 * @param {string} data.username - 用户名
 * @param {string} data.password - 密码
 * @returns {Promise<{code: number, message: string, data: {token: string, user: UserInfo}}>} 登录结果
 */
export function login(data) {
  return request({
    url: '/api/v1/auth/login',
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
 * @returns {Promise<{code: number, message: string, data: UserInfo}>} 注册结果
 */
export function register(data) {
  return request({
    url: '/api/v1/auth/register',
    method: 'post',
    data
  })
}

// ============================================
// Type Definitions (JSDoc)
// ============================================

/**
 * @typedef {Object} UserInfo
 * @property {number} id - 用户ID
 * @property {string} username - 用户名
 * @property {string} [email] - 邮箱
 * @property {string} [phone] - 手机号
 * @property {string} [avatar] - 头像URL
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 */
