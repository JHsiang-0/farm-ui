import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'

const userSource = fs.readFileSync(new URL('../src/views/UserManagement.vue', import.meta.url), 'utf8')
const profileSource = fs.readFileSync(new URL('../src/views/Profile.vue', import.meta.url), 'utf8')
const auditSource = fs.readFileSync(new URL('../src/views/AuditLog.vue', import.meta.url), 'utf8')

test('用户管理覆盖正式筛选、完整表单规则、编辑和当前管理员保护', () => {
  assert.match(userSource, /query\.enabled/)
  assert.match(userSource, /formRules/)
  assert.match(userSource, /updateAdminUser\(form\.id, data\)/)
  assert.match(userSource, /if \(!isCurrentUser\(form\)\) data\.role = form\.role/)
  assert.match(userSource, /当前管理员不能在此处修改自己的角色/)
  assert.match(userSource, /confirmMessage\(/)
  assert.match(userSource, /error\?\.status === 409/)
  assert.match(userSource, /error\?\.status === 404/)
  assert.doesNotMatch(userSource, /X-Admin-Secret/)
})

test('个人中心使用真实资料接口、脏状态取消和改密后重新登录', () => {
  assert.match(profileSource, /getProfile\(userId\)/)
  assert.match(profileSource, /updateProfile\(userId, data\)/)
  assert.match(profileSource, /profileDirty/)
  assert.match(profileSource, /cancelProfileChanges/)
  assert.match(profileSource, /beforeunload/)
  assert.match(profileSource, /confirmMessage\(/)
  assert.match(profileSource, /changePassword\(userId, \{/)
  assert.match(profileSource, /userStore\.logout\(\)/)
  assert.match(profileSource, /router\.replace\(\{ name: 'login' \}\)/)
  assert.doesNotMatch(profileSource, /password-status|migrate-passwords|Admin-Secret/)
})

test('审计页面使用正式筛选并通过详情 Drawer 展示白名单字段', () => {
  assert.match(auditSource, /actorId/)
  assert.match(auditSource, /targetType/)
  assert.match(auditSource, /query\.dateRange/)
  assert.match(auditSource, /<t-drawer/)
  assert.match(auditSource, /<t-descriptions/)
  assert.match(auditSource, /errorCode/)
  assert.match(auditSource, /traceId/)
  assert.match(auditSource, /仅展示后端审计安全视图中的白名单字段/)
  assert.doesNotMatch(auditSource, /requestBody|responseBody|password|token|secret|stackTrace/)
})
