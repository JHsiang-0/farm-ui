<template>
  <div class="profile-page app-page-shell app-page-background">
    <PageHeader title="个人中心" description="管理个人资料与登录安全设置" />
    <div class="profile-grid">
      <t-card title="个人资料" class="profile-card">
        <t-loading v-if="profileLoading && !profileLoaded" class="profile-loading" />
        <t-alert v-else-if="profileError" theme="error" :close-btn="false">
          {{ profileError }}
          <template #operation><t-button size="small" variant="outline" @click="loadProfile">重试</t-button></template>
        </t-alert>
        <t-form v-else :data="profileForm" :rules="profileRules" label-align="top" @submit="saveProfile">
          <t-alert v-if="profileSaveError" theme="error" :close-btn="false" class="mb-4">{{ profileSaveError }}</t-alert>
          <t-form-item label="用户名">
            <t-input :value="userStore.userInfo.username" disabled />
          </t-form-item>
          <t-form-item name="email" label="邮箱">
            <t-input v-model="profileForm.email" placeholder="请输入邮箱（可选）" clearable />
          </t-form-item>
          <t-form-item name="phone" label="手机号">
            <t-input v-model="profileForm.phone" placeholder="请输入手机号（可选）" clearable />
          </t-form-item>
          <t-space>
            <t-button theme="primary" type="submit" :loading="profileLoading" :disabled="!profileDirty">保存资料</t-button>
            <t-button variant="outline" :disabled="!profileDirty || profileLoading" @click="cancelProfileChanges">取消修改</t-button>
          </t-space>
        </t-form>
      </t-card>

      <t-card title="修改密码" class="profile-card">
        <t-alert v-if="passwordError" theme="error" :close-btn="false" class="mb-4">{{ passwordError }}</t-alert>
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
          <p class="mb-4 text-xs text-[var(--app-text-secondary)]">密码长度 6-20 位，必须包含大写字母、小写字母和数字。</p>
          <t-button theme="primary" type="submit" :loading="passwordLoading">修改密码</t-button>
        </t-form>
      </t-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { changePassword, getProfile, updateProfile } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { confirmMessage, message } from '@/utils/message'
import PageHeader from '@/components/layout/PageHeader.vue'

defineOptions({ name: 'ProfileView' })

const userStore = useUserStore()
const router = useRouter()
const userId = userStore.userInfo.id
const profileLoading = ref(false)
const profileLoaded = ref(false)
const profileError = ref('')
const passwordLoading = ref(false)
const profileSaveError = ref('')
const passwordError = ref('')
const profileForm = reactive({ email: '', phone: '' })
const savedProfile = reactive({ email: '', phone: '' })
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const profileDirty = computed(() => profileForm.email !== savedProfile.email || profileForm.phone !== savedProfile.phone)

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
  profileLoading.value = true
  profileError.value = ''
  try {
    const response = await getProfile(userId)
    const nextProfile = {
      email: response.data?.email ?? '',
      phone: response.data?.phone ?? ''
    }
    Object.assign(profileForm, nextProfile)
    Object.assign(savedProfile, nextProfile)
    profileLoaded.value = true
  } catch (error) {
    profileError.value = error?.message || '个人资料加载失败，请重试。'
    message.error(profileError.value)
  } finally {
    profileLoading.value = false
  }
}

const saveProfile = async ({ validateResult }) => {
  if (validateResult !== true) return
  profileLoading.value = true
  profileSaveError.value = ''
  try {
    const data = {
      email: profileForm.email.trim() || null,
      phone: profileForm.phone.trim() || null
    }
    await updateProfile(userId, data)
    Object.assign(profileForm, { email: data.email || '', phone: data.phone || '' })
    Object.assign(savedProfile, profileForm)
    userStore.userInfo = { ...userStore.userInfo, ...data }
    message.success('资料保存成功')
  } catch (error) {
    profileSaveError.value = error?.message || '资料保存失败，请重试。'
    message.error(profileSaveError.value)
  } finally {
    profileLoading.value = false
  }
}

const cancelProfileChanges = async () => {
  if (!profileDirty.value) return
  try {
    await confirmMessage('放弃当前未保存的资料修改吗？', '取消修改', {
      confirmButtonText: '放弃修改',
      cancelButtonText: '继续编辑',
      type: 'warning'
    })
  } catch {
    return
  }
  Object.assign(profileForm, savedProfile)
}

const savePassword = async ({ validateResult }) => {
  if (validateResult !== true) return
  try {
    await confirmMessage('修改密码成功后，当前会话将退出，请使用新密码重新登录。', '确认修改密码', {
      confirmButtonText: '确认修改',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  passwordLoading.value = true
  passwordError.value = ''
  try {
    await changePassword(userId, {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword
    })
    message.success('密码修改成功，请重新登录')
    userStore.logout()
    await router.replace({ name: 'login' })
  } catch (error) {
    passwordError.value = error?.message || '密码修改失败，请检查当前密码后重试。'
    message.error(passwordError.value)
  } finally {
    passwordLoading.value = false
  }
}

const handleBeforeUnload = event => {
  if (!profileDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  loadProfile()
  window.addEventListener('beforeunload', handleBeforeUnload)
})
onUnmounted(() => window.removeEventListener('beforeunload', handleBeforeUnload))
</script>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--app-spacing-6);
  width: min(100%, 1080px);
  margin: 0 auto;
}

.profile-card {
  align-self: start;
}

@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

<style scoped>
.profile-loading { min-height: 180px; }
</style>
