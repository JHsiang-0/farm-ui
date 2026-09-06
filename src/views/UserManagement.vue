<template>
  <div class="app-page-shell app-page-background user-management-page">
    <header class="user-management-header">
      <h1 class="app-route-title">用户管理</h1>
      <div class="user-management-header__actions">
        <t-button variant="outline" :icon="renderIcon(Refresh)" :loading="loading" @click="fetchUsers">刷新</t-button>
        <t-button theme="success" :icon="renderIcon(Add)" @click="openCreate">新增用户</t-button>
      </div>
    </header>

    <div class="user-management-tabs-row">
      <nav class="user-management-tabs" aria-label="用户筛选">
        <button
          v-for="tab in userTabs"
          :key="tab.value"
          type="button"
          class="user-management-tab"
          :class="{ 'user-management-tab--active': activeTab === tab.value }"
          @click="handleTabChange(tab.value)"
        >
          <span>{{ tab.label }}</span>
          <span class="user-management-tab__count">{{ tab.count }}</span>
        </button>
      </nav>
      <t-button class="user-management-more" variant="text" shape="square" aria-label="更多用户筛选">
        <More :size="18" />
      </t-button>
    </div>

    <section class="user-management-filter-card">
      <div class="user-management-filter-main">
        <t-input
          v-model="query.username"
          class="user-management-search"
          placeholder="按用户名 / 邮箱搜索"
          clearable
          @keyup.enter="handleQuery"
        >
          <template #prefixIcon><Search :size="16" /></template>
          <template #suffix><span class="user-management-shortcut">Ctrl+K</span></template>
        </t-input>

        <label class="user-management-filter-field">
          <span>角色:</span>
          <t-select v-model="query.role" class="user-management-filter-select" placeholder="全部角色" clearable>
            <t-option label="全部角色" value="" />
            <t-option label="ADMIN / 超级管理员" value="ADMIN" />
            <t-option label="OPERATOR / 生产操作员" value="OPERATOR" />
          </t-select>
        </label>

        <label class="user-management-filter-field">
          <span>状态:</span>
          <t-select v-model="query.status" class="user-management-filter-select" placeholder="全部状态" clearable>
            <t-option label="全部状态" value="" />
            <t-option label="启用" value="ACTIVE" />
            <t-option label="停用" value="DISABLED" />
          </t-select>
        </label>

        <t-button variant="outline" :icon="renderIcon(Refresh)" @click="handleReset">重置</t-button>
        <t-button theme="primary" :icon="renderIcon(Search)" :loading="loading" @click="handleQuery">查询</t-button>
      </div>

      <div class="user-management-filter-summary">
        <t-button variant="outline" size="small" disabled :icon="renderIcon(Delete)">批量操作</t-button>
        <span class="user-management-divider" />
        <span>总计 <strong>{{ displayTotal }}</strong> 位用户</span>
        <span class="user-management-divider" />
        <span>已选择 <strong>{{ selectedUserIds.length }}</strong> 项</span>
        <div class="user-management-view-toggle" role="group" aria-label="视图切换">
          <button
            type="button"
            title="列表视图"
            :class="{ 'user-management-view-toggle__button--active': viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            <List :size="16" />
          </button>
          <button
            type="button"
            title="网格视图"
            :class="{ 'user-management-view-toggle__button--active': viewMode === 'grid' }"
            @click="viewMode = 'grid'"
          >
            <Grid :size="16" />
          </button>
        </div>
      </div>
    </section>

    <section class="user-management-table-card">
      <div class="user-management-content">
        <div v-if="loading" class="user-management-state">
          <Refresh :size="32" class="is-loading" />
          <span>正在加载用户...</span>
        </div>
        <div v-else-if="visibleUsers.length === 0" class="user-management-state">
          <UserIcon :size="48" />
          <span>暂无用户数据</span>
        </div>

        <div v-else-if="viewMode === 'list'" class="user-management-table-area">
          <div ref="tableScrollRef" class="user-management-table-scroll">
            <div ref="tableContentScrollRef" class="user-management-table-content-scroll" @scroll="handleTableHorizontalScroll">
              <TdTable
                class="user-management-table"
                :data="visibleUsers"
                :loading="loading"
                row-key="id"
                @selection-change="handleSelectionChange"
              >
            <TdTableColumn type="selection" width="48" align="center" />
            <TdTableColumn label="ID" width="82">
              <template #default="{ row }"><span class="user-management-id">#{{ row.id }}</span></template>
            </TdTableColumn>
            <TdTableColumn label="用户名" min-width="190">
              <template #default="{ row }">
                <div class="user-management-user-cell">
                  <span class="user-management-avatar" :class="{ 'user-management-avatar--operator': row.role !== 'ADMIN' }">{{ getInitials(row.username) }}</span>
                  <div>
                    <strong>{{ row.username || '-' }}</strong>
                    <small>{{ getUserDescription(row) }}</small>
                  </div>
                </div>
              </template>
            </TdTableColumn>
            <TdTableColumn label="角色" width="142">
              <template #default="{ row }">
                <span class="user-management-role" :class="getRoleClass(row.role)">{{ row.role || '-' }}</span>
              </template>
            </TdTableColumn>
            <TdTableColumn label="邮箱" min-width="210">
              <template #default="{ row }">
                <span class="user-management-email"><Mail :size="15" />{{ row.email || '-' }}</span>
              </template>
            </TdTableColumn>
            <TdTableColumn label="所属部门" min-width="205">
              <template #default="{ row }">{{ row.department || '生产运营中心 / 核心组' }}</template>
            </TdTableColumn>
            <TdTableColumn label="状态" width="112" align="center">
              <template #default="{ row }">
                <span class="user-management-status" :class="{ 'user-management-status--disabled': !row.enabled }">
                  <i />{{ row.enabled ? '启用' : '停用' }}
                </span>
              </template>
            </TdTableColumn>
            <TdTableColumn label="最后登录" width="172">
              <template #default="{ row }"><span class="user-management-last-login">{{ getLastLogin(row) }}</span></template>
            </TdTableColumn>
            <TdTableColumn label="操作" width="218" align="right" fixed="right">
              <template #default="{ row }">
                <div class="user-management-actions">
                  <t-button size="small" variant="text" @click="openEdit(row)">编辑</t-button>
                  <span>|</span>
                  <t-button size="small" variant="text" theme="primary" @click="openPasswordReset(row)">重置密码</t-button>
                  <span>|</span>
                  <t-button size="small" variant="text" theme="danger" :disabled="String(row.id) === currentUserId" @click="toggleUser(row)">
                    {{ row.enabled ? '停用' : '启用' }}
                  </t-button>
                </div>
              </template>
            </TdTableColumn>
              </TdTable>
            </div>
          </div>
        </div>

        <div v-else class="user-management-grid-view">
          <article v-for="user in visibleUsers" :key="user.id" class="user-management-grid-card">
            <div class="user-management-grid-card__top">
              <div class="user-management-user-cell">
                <span class="user-management-avatar" :class="{ 'user-management-avatar--operator': user.role !== 'ADMIN' }">{{ getInitials(user.username) }}</span>
                <div><strong>{{ user.username }}</strong><small>#{{ user.id }}</small></div>
              </div>
              <span class="user-management-status" :class="{ 'user-management-status--disabled': !user.enabled }"><i />{{ user.enabled ? '启用' : '停用' }}</span>
            </div>
            <span class="user-management-role" :class="getRoleClass(user.role)">{{ user.role }}</span>
            <span class="user-management-grid-card__email">{{ user.email || '未填写邮箱' }}</span>
            <div class="user-management-grid-card__bottom">
              <span>{{ getLastLogin(user) }}</span>
              <t-button size="small" variant="text" @click="openEdit(user)">编辑</t-button>
            </div>
          </article>
        </div>
      </div>

      <footer class="user-management-footer">
        <div v-if="viewMode === 'list'" ref="horizontalScrollRef" class="user-management-horizontal-scroll" aria-label="横向滚动条" @scroll="handleHorizontalScroll">
          <div class="user-management-horizontal-scroll__content" />
        </div>
        <div class="user-management-footer__main">
          <span>共 <strong>{{ displayTotal }}</strong> 条数据</span>
          <t-pagination
            v-model:current="pagination.pageNum"
            :page-size="pagination.pageSize"
            :total="displayTotal"
            :show-page-size="false"
            :total-content="false"
            @change="handlePageChange"
          />
        </div>
      </footer>
    </section>

    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogTitle"
      :confirm-btn="{ loading: submitting }"
      @confirm="submitUser"
    >
      <t-form :data="form" label-width="84px">
        <t-form-item label="用户名">
          <t-input v-model="form.username" :disabled="dialogMode !== 'create'" />
        </t-form-item>
        <t-form-item v-if="dialogMode !== 'password'" label="角色">
          <t-select v-model="form.role">
            <t-option label="操作员" value="OPERATOR" />
            <t-option label="管理员" value="ADMIN" />
          </t-select>
        </t-form-item>
        <t-form-item v-if="dialogMode !== 'password'" label="邮箱">
          <t-input v-model="form.email" />
        </t-form-item>
        <t-form-item label="密码">
          <t-input v-model="form.password" type="password" :placeholder="dialogMode === 'password' ? '请输入新的登录密码' : '请输入密码'" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  AddIcon as Add,
  DeleteIcon as Delete,
  GridViewIcon as Grid,
  MailIcon as Mail,
  MoreIcon as More,
  RefreshIcon as Refresh,
  SearchIcon as Search,
  UserIcon,
  ViewListIcon as List
} from 'tdesign-icons-vue-next'
import { createAdminUser, getAdminUsers, setAdminUserEnabled, updateAdminUser } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { message } from '@/utils/message'
import { formatDateTime } from '@/utils/formatters'
import { renderIcon } from '@/utils/tdesign'
import TdTable from '@/components/TdTable.vue'
import TdTableColumn from '@/components/TdTableColumn.vue'

defineOptions({ name: 'UserManagement' })

const userStore = useUserStore()
const currentUserId = String(userStore.userInfo.id ?? '')
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const users = ref([])
const selectedUserIds = ref([])
const viewMode = ref('list')
const activeTab = ref('all')
const dialogMode = ref('create')
const editingUserId = ref(null)
const query = reactive({ username: '', role: '', status: '' })
const pagination = reactive({ pageNum: 1, pageSize: 10, total: 0 })
const form = reactive({ username: '', password: '', role: 'OPERATOR', email: '' })
const tableScrollRef = ref(null)
const tableContentScrollRef = ref(null)
const horizontalScrollRef = ref(null)

const visibleUsers = computed(() => {
  if (query.status === 'ACTIVE') return users.value.filter(user => user.enabled)
  if (query.status === 'DISABLED') return users.value.filter(user => !user.enabled)
  return users.value
})

const displayTotal = computed(() => query.status ? visibleUsers.value.length : pagination.total)

const userTabs = computed(() => [
  { label: '全部', value: 'all', count: pagination.total },
  { label: '管理员', value: 'ADMIN', count: users.value.filter(user => user.role === 'ADMIN').length },
  { label: '操作员', value: 'OPERATOR', count: users.value.filter(user => user.role === 'OPERATOR').length },
  { label: '已停用', value: 'DISABLED', count: users.value.filter(user => !user.enabled).length }
])

const dialogTitle = computed(() => ({
  create: '新增用户',
  edit: '编辑用户',
  password: '重置密码'
}[dialogMode.value]))

const getInitials = username => String(username || '?').slice(0, 2).toUpperCase()
const getUserDescription = user => user.role === 'ADMIN' ? '系统超级管理员' : '生产操作员'
const getLastLogin = user => formatDateTime(user.lastLoginAt || user.lastLogin || user.updatedAt || user.createdAt)
const getRoleClass = role => 'user-management-role--' + String(role || '').toLowerCase()

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await getAdminUsers({
      username: query.username.trim(),
      role: query.role,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize
    })
    users.value = res.data?.records || []
    pagination.total = res.data?.total || 0
    selectedUserIds.value = []
  } catch (error) {
    console.error('获取用户列表失败:', error)
    message.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  activeTab.value = 'all'
  pagination.pageNum = 1
  fetchUsers()
}

const handleReset = () => {
  query.username = ''
  query.role = ''
  query.status = ''
  activeTab.value = 'all'
  pagination.pageNum = 1
  fetchUsers()
}

const handleTabChange = value => {
  activeTab.value = value
  query.status = value === 'DISABLED' ? 'DISABLED' : ''
  query.role = ['ADMIN', 'OPERATOR'].includes(value) ? value : ''
  pagination.pageNum = 1
  fetchUsers()
}

const handlePageChange = ({ current }) => {
  pagination.pageNum = current
  fetchUsers()
}

const handleSelectionChange = rows => {
  selectedUserIds.value = rows.map(row => row.id ?? row)
}

const handleHorizontalScroll = event => {
  const tableContent = tableContentScrollRef.value
  if (tableContent && tableContent.scrollLeft !== event.currentTarget.scrollLeft) {
    tableContent.scrollLeft = event.currentTarget.scrollLeft
  }
}

const handleTableHorizontalScroll = event => {
  const horizontalScroll = horizontalScrollRef.value
  if (horizontalScroll && horizontalScroll.scrollLeft !== event.currentTarget.scrollLeft) {
    horizontalScroll.scrollLeft = event.currentTarget.scrollLeft
  }
}

const resetForm = () => Object.assign(form, { username: '', password: '', role: 'OPERATOR', email: '' })

const openCreate = () => {
  resetForm()
  dialogMode.value = 'create'
  editingUserId.value = null
  dialogVisible.value = true
}

const openEdit = user => {
  Object.assign(form, { username: user.username || '', password: '', role: user.role || 'OPERATOR', email: user.email || '' })
  dialogMode.value = 'edit'
  editingUserId.value = user.id
  dialogVisible.value = true
}

const openPasswordReset = user => {
  Object.assign(form, { username: user.username || '', password: '', role: user.role || 'OPERATOR', email: user.email || '' })
  dialogMode.value = 'password'
  editingUserId.value = user.id
  dialogVisible.value = true
}

const submitUser = async () => {
  if (!form.username.trim() || ((dialogMode.value === 'create' || dialogMode.value === 'password') && !form.password.trim())) {
    message.warning(dialogMode.value === 'edit' ? '请输入用户名' : '请输入用户名和密码')
    return
  }
  submitting.value = true
  try {
    if (dialogMode.value === 'create') {
      await createAdminUser({ ...form })
      message.success('用户创建成功')
    } else {
      const payload = dialogMode.value === 'password'
        ? { password: form.password }
        : { role: form.role, email: form.email, password: form.password }
      await updateAdminUser(editingUserId.value, payload)
      message.success(dialogMode.value === 'password' ? '密码重置成功' : '用户信息已更新')
    }
    dialogVisible.value = false
    fetchUsers()
  } catch (error) {
    console.error('保存用户失败:', error)
    message.error(error.message || '保存用户失败')
  } finally {
    submitting.value = false
  }
}

const toggleUser = async user => {
  try {
    await setAdminUserEnabled(user.id, !user.enabled)
    message.success(user.enabled ? '用户已停用' : '用户已启用')
    fetchUsers()
  } catch (error) {
    console.error('更新用户状态失败:', error)
    message.error('更新用户状态失败')
  }
}

const handleGlobalShortcut = event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    document.querySelector('.user-management-search input')?.focus()
  }
}

onMounted(() => {
  fetchUsers()
  window.addEventListener('keydown', handleGlobalShortcut)
})

onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalShortcut))
</script>

<style scoped>
.user-management-page { gap: 1rem; height: 100%; padding: 1.25rem 1.5rem; }
.user-management-header { display: flex; align-items: center; flex: 0 0 auto; justify-content: space-between; gap: 1rem; }
.user-management-header h1 { margin: 0; color: var(--app-text-primary); font-size: 1.625rem; letter-spacing: -0.02em; }
.user-management-header__actions { display: flex; align-items: center; gap: 0.75rem; }
.user-management-tabs-row { display: flex; align-items: center; flex: 0 0 auto; justify-content: space-between; border-bottom: 1px solid var(--app-border); }
.user-management-tabs { display: flex; align-items: stretch; gap: 1.5rem; }
.user-management-tab { position: relative; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 0.15rem; border: 0; background: transparent; color: var(--app-text-secondary); cursor: pointer; font-size: 0.875rem; }
.user-management-tab::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: transparent; content: ''; }
.user-management-tab--active { color: var(--app-primary); font-weight: 600; }
.user-management-tab--active::after { background: var(--app-primary); }
.user-management-tab__count { padding: 0.125rem 0.45rem; border-radius: 999px; background: var(--app-surface-muted); color: var(--app-text-secondary); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.6875rem; }
.user-management-tab--active .user-management-tab__count { background: var(--app-primary-light); color: var(--app-primary-active); }
.user-management-more { color: var(--app-text-secondary); }
.user-management-filter-card, .user-management-table-card { border: 1px solid var(--app-border); border-radius: 0.625rem; background: var(--app-surface); box-shadow: 0 1px 2px rgb(15 23 42 / 4%); }
.user-management-filter-card { display: flex; align-items: center; justify-content: space-between; flex: 0 0 auto; gap: 1rem; padding: 1rem; }
.user-management-filter-main, .user-management-filter-summary, .user-management-filter-field, .user-management-user-cell, .user-management-email, .user-management-actions, .user-management-status { display: flex; align-items: center; }
.user-management-filter-main { flex-wrap: wrap; gap: 0.75rem; min-width: 0; }
.user-management-search { width: min(20rem, 25vw); }
.user-management-shortcut { color: var(--app-text-placeholder); font-size: 0.625rem; }
.user-management-filter-field { gap: 0.4rem; color: var(--app-text-secondary); font-size: 0.75rem; white-space: nowrap; }
.user-management-filter-select { width: 10.5rem; }
.user-management-filter-summary { flex-shrink: 0; gap: 0.625rem; color: var(--app-text-secondary); font-size: 0.75rem; white-space: nowrap; }
.user-management-filter-summary strong { color: var(--app-text-primary); font-weight: 600; }
.user-management-divider { width: 1px; height: 1rem; background: var(--app-border-strong); }
.user-management-view-toggle { display: inline-flex; align-items: center; gap: 0.15rem; padding: 0.15rem; border: 1px solid var(--app-border); border-radius: 0.375rem; background: var(--app-surface-muted); }
.user-management-view-toggle button { display: inline-flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.5rem; padding: 0; border: 0; border-radius: 0.25rem; background: transparent; color: var(--app-text-placeholder); cursor: pointer; }
.user-management-view-toggle button:hover, .user-management-view-toggle__button--active { background: var(--app-surface); color: var(--app-primary) !important; box-shadow: 0 1px 2px rgb(15 23 42 / 8%); }
.user-management-table-card { position: relative; display: flex; flex: 1 1 0%; flex-direction: column; width: 100%; height: 0; min-width: 0; min-height: 0; overflow: hidden; }
.user-management-content { display: flex; flex: 1 1 0%; flex-direction: column; width: 100%; height: 0; min-width: 0; min-height: 0; padding-bottom: 5rem; overflow: hidden; }
.user-management-table-area { display: flex; flex: 1 1 0%; flex-direction: column; width: 100%; height: 0; min-width: 0; min-height: 0; }
.user-management-table-scroll, .user-management-grid-view { flex: 1 1 0%; min-width: 0; min-height: 0; overflow: auto; }
.user-management-table-scroll { height: 0; overflow-x: hidden; overflow-y: scroll; scrollbar-gutter: stable; }
.user-management-table-content-scroll { width: 100%; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }
.user-management-table-content-scroll::-webkit-scrollbar { display: none; }
.user-management-table { width: 73rem; min-width: 73rem; }
.user-management-horizontal-scroll { flex: 0 0 auto; height: 0.75rem; overflow-x: auto; overflow-y: hidden; background: var(--app-surface); }
.user-management-horizontal-scroll::-webkit-scrollbar { height: 0.75rem; }
.user-management-horizontal-scroll__content { width: 73rem; min-width: 100%; height: 1px; }
.user-management-table :deep(th) { height: 2.75rem; background: var(--app-surface-muted); color: var(--app-text-secondary); font-size: 0.75rem; font-weight: 500; }
.user-management-table :deep(td) { height: 4.5rem; padding: 0.625rem 1rem; color: var(--app-text-secondary); font-size: 0.75rem; }
.user-management-table :deep(tr:hover td) { background: var(--app-surface-muted); }
.user-management-id, .user-management-last-login, .user-management-user-cell small, .user-management-grid-card__bottom { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.user-management-id { color: var(--app-text-secondary); font-size: 0.6875rem; font-weight: 600; }
.user-management-user-cell { gap: 0.75rem; min-width: 0; }
.user-management-user-cell > div { display: flex; flex-direction: column; min-width: 0; gap: 0.2rem; }
.user-management-user-cell strong { color: var(--app-text-primary); font-size: 0.8125rem; font-weight: 600; }
.user-management-user-cell small { color: var(--app-text-placeholder); font-size: 0.625rem; }
.user-management-avatar { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 2rem; height: 2rem; border: 1px solid var(--app-success-light); border-radius: 50%; background: var(--app-success-light); color: var(--app-success-active); font-size: 0.6875rem; font-weight: 700; }
.user-management-avatar--operator { border-color: var(--app-border); background: var(--app-surface-muted); color: var(--app-text-secondary); }
.user-management-role { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 0.2rem; background: var(--app-text-primary); color: #fff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.625rem; font-weight: 600; letter-spacing: 0.03em; }
.user-management-role--operator { background: var(--app-success); }
.user-management-email { gap: 0.4rem; color: var(--app-text-secondary); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.6875rem; white-space: nowrap; }
.user-management-email :deep(svg) { color: var(--app-text-placeholder); }
.user-management-status { justify-content: center; gap: 0.4rem; width: fit-content; margin: 0 auto; padding: 0.3rem 0.6rem; border: 1px solid var(--app-success-light); border-radius: 999px; background: var(--app-success-light); color: var(--app-success-active); font-size: 0.6875rem; font-weight: 500; white-space: nowrap; }
.user-management-status i { width: 0.375rem; height: 0.375rem; border-radius: 50%; background: var(--app-success); }
.user-management-status--disabled { border-color: var(--app-border); background: var(--app-surface-muted); color: var(--app-text-placeholder); }
.user-management-status--disabled i { background: var(--app-text-placeholder); }
.user-management-last-login { color: var(--app-text-secondary); font-size: 0.6875rem; white-space: nowrap; }
.user-management-actions { justify-content: flex-end; gap: 0.35rem; white-space: nowrap; }
.user-management-actions > span { color: var(--app-border); }
.user-management-footer { position: absolute; right: 0; bottom: 0; left: 0; z-index: 3; display: flex; flex-direction: column; width: 100%; height: 5rem; min-height: 5rem; padding: 0 1rem; border-top: 1px solid var(--app-surface-muted); background: var(--app-surface); color: var(--app-text-secondary); font-size: 0.75rem; }
.user-management-footer__main { display: flex; align-items: center; justify-content: space-between; flex: 1 1 auto; flex-wrap: nowrap; min-height: 4.25rem; width: 100%; white-space: nowrap; }
.user-management-footer__main > span { flex: 0 0 auto; white-space: nowrap; }
.user-management-footer strong { color: var(--app-text-primary); font-weight: 600; }
.user-management-footer :deep(.t-pagination) { margin: 0; }
.user-management-footer :deep(.t-pagination__total) { display: none; }
.user-management-grid-view { display: grid; align-content: start; grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr)); gap: 0.75rem; padding: 1rem; }
.user-management-grid-card { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; border: 1px solid var(--app-border); border-radius: 0.5rem; }
.user-management-grid-card__top, .user-management-grid-card__bottom { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.user-management-grid-card__email { overflow: hidden; color: var(--app-text-secondary); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.6875rem; text-overflow: ellipsis; white-space: nowrap; }
.user-management-grid-card__bottom { color: var(--app-text-placeholder); font-size: 0.625rem; }
.user-management-state { display: flex; align-items: center; justify-content: center; flex: 1 1 auto; flex-direction: column; gap: 0.75rem; color: var(--app-text-placeholder); font-size: 0.8125rem; }
.is-loading { animation: user-management-spin 1s linear infinite; }
@keyframes user-management-spin { to { transform: rotate(360deg); } }
@media (max-width: 1150px) {
  .user-management-filter-card { align-items: flex-start; flex-direction: column; }
  .user-management-filter-summary { width: 100%; justify-content: flex-end; }
  .user-management-search { width: 16rem; }
}
@media (max-width: 768px) {
  .user-management-page { padding: 1rem; }
  .user-management-header { align-items: flex-start; flex-direction: column; }
  .user-management-header__actions { width: 100%; justify-content: flex-end; }
  .user-management-tabs-row { overflow-x: auto; }
  .user-management-tabs { gap: 1rem; }
  .user-management-more { display: none; }
  .user-management-filter-main { width: 100%; }
  .user-management-search, .user-management-filter-field, .user-management-filter-select { width: 100%; }
  .user-management-filter-summary { justify-content: flex-start; overflow-x: auto; }
  .user-management-footer { padding: 0.75rem; }
}
</style>
