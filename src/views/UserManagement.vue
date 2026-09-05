<template>
  <div class="app-page-shell app-page-background">
    <div class="app-page-toolbar mb-4">
      <h1 class="app-page-toolbar__title app-route-title">用户管理</h1>
      <div class="app-page-toolbar__actions">
        <t-button theme="primary" @click="openCreate">新增用户</t-button>
      </div>
    </div>

    <t-card class="app-page-card shadow-sm">
      <div class="flex gap-3 mb-4">
        <t-input v-model="query.username" placeholder="按用户名搜索" clearable @enter="fetchUsers" />
        <t-input v-model="query.email" placeholder="按邮箱搜索" clearable @enter="fetchUsers" />
        <t-select v-model="query.role" placeholder="角色" clearable style="width: 150px" @change="fetchUsers">
          <t-option label="管理员" value="ADMIN" /><t-option label="操作员" value="OPERATOR" />
        </t-select>
        <t-button @click="fetchUsers" :loading="loading">查询</t-button>
      </div>
      <TdTable :data="users" :loading="loading" class="flex-1 min-h-0">
        <TdTableColumn prop="id" label="ID" width="80" />
        <TdTableColumn prop="username" label="用户名" />
        <TdTableColumn prop="role" label="角色" />
        <TdTableColumn prop="email" label="邮箱" />
        <TdTableColumn prop="enabled" label="状态">
          <template #default="{ row }"><t-tag :theme="row.enabled ? 'success' : 'default'">{{ row.enabled ? '启用' : '停用' }}</t-tag></template>
        </TdTableColumn>
        <TdTableColumn label="操作" width="120">
          <template #default="{ row }">
            <t-button size="small" variant="text" :disabled="String(row.id) === String(currentUserId)" @click="toggleUser(row)">{{ row.enabled ? '停用' : '启用' }}</t-button>
          </template>
        </TdTableColumn>
      </TdTable>
      <t-pagination v-model:current="pagination.pageNum" v-model:pageSize="pagination.pageSize" :total="pagination.total" class="mt-4 justify-center" @change="fetchUsers" />
    </t-card>

    <t-dialog v-model:visible="dialogVisible" header="新增用户" @confirm="submitCreate" :confirm-btn="{ loading: submitting }">
      <t-form :data="form" label-width="80px">
        <t-form-item label="用户名"><t-input v-model="form.username" /></t-form-item>
        <t-form-item label="密码"><t-input v-model="form.password" type="password" /></t-form-item>
        <t-form-item label="确认密码"><t-input v-model="form.confirmPassword" type="password" /></t-form-item>
        <t-form-item label="邮箱"><t-input v-model="form.email" /></t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { getAdminUsers, createAdminUser, setAdminUserEnabled } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { message } from '@/utils/message'
import TdTable from '@/components/TdTable.vue'
import TdTableColumn from '@/components/TdTableColumn.vue'

defineOptions({ name: 'UserManagement' })
const userStore = useUserStore()
const currentUserId = userStore.userInfo.id
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const users = ref([])
const query = reactive({ username: '', email: '', role: '' })
const pagination = reactive({ pageNum: 1, pageSize: 10, total: 0 })
const form = reactive({ username: '', password: '', confirmPassword: '', email: '', phone: '' })

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await getAdminUsers({ ...query, ...pagination })
    users.value = res.data?.records || []
    pagination.total = res.data?.total || 0
  } finally { loading.value = false }
}
const openCreate = () => { Object.assign(form, { username: '', password: '', confirmPassword: '', email: '', phone: '' }); dialogVisible.value = true }
const submitCreate = async () => {
  if (!form.username || !form.password || form.password !== form.confirmPassword) {
    message.warning('请填写用户名、密码并确认两次密码一致')
    return
  }
  submitting.value = true
  try {
    await createAdminUser({ ...form })
    message.success('操作员创建成功')
    dialogVisible.value = false
    await fetchUsers()
  } finally { submitting.value = false }
}
const toggleUser = async user => {
  if (String(user.id) === String(currentUserId)) return
  const enabled = !user.enabled
  await setAdminUserEnabled(user.id, enabled)
  message.success(enabled ? '用户已启用' : '用户已停用')
  await fetchUsers()
}
onMounted(fetchUsers)
</script>
