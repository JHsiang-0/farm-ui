import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/views/FileLibrary.vue', import.meta.url), 'utf8')
const detailSource = fs.readFileSync(new URL('../src/components/file/FileDetailDrawer.vue', import.meta.url), 'utf8')

test('文件中心使用真实文件树契约并提供统一目录导航', () => {
  assert.match(source, /getFileTree/)
  assert.match(source, /<t-tree/)
  assert.match(source, /@click="handleTreeClick"/)
  assert.match(source, /getFileTree\(\)/)
  assert.match(source, /parentId: node.parentId \?\? null/)
  assert.equal(source.includes('children: Array.isArray(node.children)'), true)
  assert.match(source, /class="file-library-layout"/)
  assert.match(source, /class="file-library-results"/)
  assert.match(source, /class="file-library-sidebar"/)
  assert.doesNotMatch(source, /class="file-library-content-card"/)
})

test('文件中心不伪造材料和统计值，并覆盖上传删除结果态', () => {
  assert.doesNotMatch(source, /materialType \|\| 'PLA'/)
  assert.doesNotMatch(source, /filamentWeight \|\| 0/)
  assert.doesNotMatch(source, /filamentLength \|\| 0/)
  assert.doesNotMatch(source, /printCount \|\| 0/)
  assert.match(source, /formatMetric/)
  assert.match(source, /retryableFiles/)
  assert.match(source, /items.length !== ids.length/)
  assert.match(source, /error\?\.response\?\.status === 422/)
})

test('文件详情仅展示安全元数据并区分缩略图不可用', () => {
  assert.match(detailSource, /暂无缩略图/)
  assert.match(detailSource, /file.thumbnailError/)
  assert.doesNotMatch(detailSource, /rustfsKey|safeName|fileUrl/)
  assert.doesNotMatch(detailSource, /上传用户ID/)
  assert.match(source, /getThumbnailUrl\(file\.id\)/)
})
