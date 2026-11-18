<script setup lang="ts">
import { showSuccessToast } from 'vant';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const mode = ref<'login' | 'register'>('login');
const username = ref('');
const password = ref('');
const nickname = ref('');
const loading = ref(false);
const error = ref('');

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    if (mode.value === 'login') await auth.login(username.value.trim(), password.value);
    else await auth.register(username.value.trim(), password.value, nickname.value.trim() || undefined);
    showSuccessToast(mode.value === 'login' ? '登录成功' : '注册成功');
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/mine';
    router.replace(redirect.startsWith('/') ? redirect : '/mine');
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login">
    <van-nav-bar left-arrow @click-left="router.back()" />
    <h1>{{ mode === 'login' ? '登录' : '注册账号' }}</h1>
    <p class="sub">登录后可以保存作品，换手机也能找回</p>

    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field
          v-model="username"
          name="username"
          label="用户名"
          placeholder="4~32 位字母、数字或下划线"
          autocomplete="username"
          :rules="[{ required: true, message: '请输入用户名' }]"
        />
        <van-field
          v-if="mode === 'register'"
          v-model="nickname"
          name="nickname"
          label="昵称"
          placeholder="选填"
          maxlength="32"
        />
        <van-field
          v-model="password"
          type="password"
          name="password"
          label="密码"
          :placeholder="mode === 'register' ? '至少 8 位，包含字母和数字' : '请输入密码'"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          :rules="[{ required: true, message: '请输入密码' }]"
        />
      </van-cell-group>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="submit">
        <van-button round block type="primary" native-type="submit" :loading="loading">
          {{ mode === 'login' ? '登录' : '注册并登录' }}
        </van-button>
        <van-button round block plain @click="mode = mode === 'login' ? 'register' : 'login'">
          {{ mode === 'login' ? '没有账号？去注册' : '已有账号？去登录' }}
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<style scoped>
.login h1 {
  margin: 24px 24px 4px;
  font-size: 26px;
}
.sub {
  margin: 0 24px 24px;
  color: var(--text-2);
  font-size: 14px;
}
.error {
  color: #ee0a24;
  font-size: 13px;
  margin: 12px 32px 0;
}
.submit {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 24px 16px;
}
</style>
