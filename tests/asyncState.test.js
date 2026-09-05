import assert from 'node:assert/strict'
import test from 'node:test'
import { ASYNC_STATES, getAsyncErrorMessage, getAsyncState } from '../src/utils/asyncState.js'

test('异步状态按加载、错误、空数据和就绪顺序解析', () => {
  assert.equal(getAsyncState({ loading: true, error: new Error('请求失败'), hasData: true }), ASYNC_STATES.LOADING)
  assert.equal(getAsyncState({ error: new Error('请求失败'), hasData: true }), ASYNC_STATES.ERROR)
  assert.equal(getAsyncState({ hasData: false }), ASYNC_STATES.EMPTY)
  assert.equal(getAsyncState({ hasData: true }), ASYNC_STATES.READY)
})

test('异步错误信息支持字符串、Error 和默认文案', () => {
  assert.equal(getAsyncErrorMessage('服务不可用'), '服务不可用')
  assert.equal(getAsyncErrorMessage(new Error('网络异常')), '网络异常')
  assert.equal(getAsyncErrorMessage(null), '加载失败，请重试')
})
