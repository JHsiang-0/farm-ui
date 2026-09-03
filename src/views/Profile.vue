<template>
  <div class="h-full overflow-auto bg-gray-50 p-6">
    <div class="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
      <t-card title="个人资料" class="shadow-sm">
        <t-form :data="profileForm" :rules="profileRules" label-align="top" @submit="saveProfile">
          <t-form-item label="用户名">
            <t-input :value="userStore.userInfo.username" disabled />
          </t-form-item>
          <t-form-item name="email" label="邮箱">
            <t-input v-model="profileForm.email" placeholder="请输入邮箱（可选）" clearable />
          </t-form-item>
          <t-form-item name="phone" label="手机号">
            <t-input v-model="profileForm.phone" placeholder="请输入手机号（可选）" clearable />
          </t-form-item>
          <t-button theme="primary" type="submit" :loading="profileLoading">保存资料</t-button>
        </t-form>
      </t-card>

      <t-card title="修改密码" class="shadow-sm">
        <t-form :data="passwordForm" :rules="passwordRules" label-align="top" @submit="savePassword">
          <t-form-item name="oldPassword" label="当前密码">
            <t-input v-model="passwordForm.oldPassword" type="password" autocomplete="current-password" />
          </t-form-item>
          <t-form-item name="newPassword" label="新密码">
            <t-input v-model="passwordForm.newPassword" type="password" autocomplete="new-password" />
          </t-form-item>
          <t-form-item name="confirmPassword" label="确认新密码">
            <t-input v-model="passwordForm.confirmPassword" type="password" autocomplete="new-password" />
          </t-form-item>
          <p class="mb-4 text-xs text-gray-500">密码长度 6-20 位，必须包含大写字母、小写字母和数字。</p>
          <t-button theme="primary" type="submit" :loading="passwordLoading">修改密码</t-button>
        </t-form>
      </t-card>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { changePassword, getProfile, updateProfile } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { message } from '@/utils/message'

defineOptions({ name: 'ProfileView' })

const userStore = useUserStore()
const userId = userStore.userInfo.id
const profileLoading = ref(false)
const passwordLoading = ref(false)
const profileForm = reactive({ email: '', phone: '' })
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,20}$/
const profileRules = {
  email: [{ email: true, message: '邮箱格式不正确', trigger: 'blur' }],
  phone: [{ pattern: /^$|^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }]
}
const passwordRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [{ required: true, message: '请输入新密码', trigger: 'blur' }, {
    validator: value => passwordPattern.test(value) ? true : { result: false, message: '密码必须为6-20位且包含大小写字母和数字' },
    trigger: 'blur'
  }],
  confirmPassword: [{ required: true, message: '请再次输入新密码', trigger: 'blur' }, {
    validator: value => value === passwordForm.newPassword ? true : { result: false, message: '两次输入的新密码不一致' },
    trigger: 'blur'
  }]
}

const loadProfile = async () => {
  const response = await getProfile(userId)
  Object.assign(profileForm, {
    email: response.data?.email || '',
    phone: response.data?.phone || ''
  })
}

const saveProfile = async ({ validateResult }) => {
  if (validateResult !== true) return
  profileLoading.value = true
  try {
    const data = {
      email: profileForm.email.trim() || null,
      phone: profileForm.phone.trim() || null
    }
    await updateProfile(userId, data)
    userStore.userInfo = { ...userStore.userInfo, ...data }
    message.success('资料保存成功')
  } finally {
    profileLoading.value = false
  }
}

const savePassword = async ({ validateResult }) => {
  if (validateResult !== true) return
  passwordLoading.value = true
  try {
    await changePassword(userId, passwordForm)
    Object.assign(passwordForm, { oldPassword: '', newPassword: '', confirmPassword: '' })
    message.success('密码修改成功，请使用新密码登录')
  } finally {
    passwordLoading.value = false
  }
}

onMounted(loadProfile)
</script>
