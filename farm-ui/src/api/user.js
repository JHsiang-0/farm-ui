import request from '@/utils/request'

export function login(data) {
  return request({
    url: '/api/v1/auth/login', // 对应你后端的 FarmUserController
    method: 'post',
    data
  })
}

export function register(data) {
  return request({
    url: '/api/v1/auth/register',
    method: 'post',
    data
  })
}