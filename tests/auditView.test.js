import assert from 'node:assert/strict'
import test from 'node:test'
import { getAuditActionLabel, getAuditResultView, getAuditTargetLabel } from '../src/utils/auditView.js'

test('审计视图将已知动作和目标转换为用户文案', () => {
  assert.equal(getAuditActionLabel('JOB_CANCEL'), '取消打印任务')
  assert.equal(getAuditTargetLabel({ targetType: 'PRINTER', targetId: '12' }), '打印机 #12')
  assert.deepEqual(getAuditResultView('SUCCESS'), { label: '成功', theme: 'success' })
})

test('未知审计动作不把原始枚举直接当作界面文案', () => {
  assert.equal(getAuditActionLabel('UNRECOGNIZED_ACTION'), '其他操作')
  assert.equal(getAuditActionLabel(), '未记录动作')
})
