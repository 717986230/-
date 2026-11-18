<script setup lang="ts">
import { showConfirmDialog, showFailToast, showImagePreview } from 'vant';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { worksApi, type WorkView } from '@/api';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const works = ref<WorkView[]>([]);
const loading = ref(false);
const finished = ref(false);
const error = ref(false);
let page = 0;

async function loadMore() {
  if (!auth.loggedIn) {
    finished.value = true;
    return;
  }
  loading.value = true;
  try {
    const res = await worksApi.list(page + 1, 20);
    page = res.page;
    works.value.push(...res.items);
    finished.value = works.value.length >= res.total;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

watch(
  () => auth.loggedIn,
  () => {
    works.value = [];
    page = 0;
    finished.value = false;
  },
);

function preview(w: WorkView, start = 0) {
  showImagePreview({ images: w.files.map((f) => f.url), startPosition: start, closeable: true });
}

async function remove(w: WorkView) {
  try {
    await showConfirmDialog({ title: '删除作品', message: '删除后无法恢复，确定删除吗？' });
  } catch {
    return;
  }
  try {
    await worksApi.remove(w.id);
    works.value = works.value.filter((x) => x.id !== w.id);
  } catch (e) {
    showFailToast((e as Error).message);
  }
}

async function logout() {
  await showConfirmDialog({ title: '退出登录？' }).then(auth.logout, () => undefined);
}

const fmt = (s: string) => new Date(s).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
</script>

<template>
  <div class="page mine">
    <header class="profile">
      <div class="avatar">{{ auth.user?.nickname?.slice(0, 1) ?? '?' }}</div>
      <div v-if="auth.loggedIn" class="who">
        <strong>{{ auth.user!.nickname }}</strong>
        <span>@{{ auth.user!.username }}</span>
      </div>
      <div v-else class="who">
        <strong>未登录</strong>
        <span>登录后可保存和管理作品</span>
      </div>
      <van-button v-if="auth.loggedIn" size="small" round plain @click="logout">退出</van-button>
      <van-button v-else size="small" round type="primary" @click="router.push('/login')">登录</van-button>
    </header>

    <h2>我的作品</h2>
    <van-empty v-if="!auth.loggedIn" description="登录后查看作品" />
    <van-list
      v-else
      v-model:loading="loading"
      v-model:error="error"
      :finished="finished"
      finished-text=""
      error-text="加载失败，点击重试"
      @load="loadMore"
    >
      <van-empty v-if="finished && !works.length" description="还没有作品，去做一张吧">
        <van-button round type="primary" @click="router.push('/')">去选模板</van-button>
      </van-empty>
      <div class="works">
        <div v-for="w in works" :key="w.id" class="work">
          <img :src="w.files[0]?.url" :alt="w.title" loading="lazy" @click="preview(w)" />
          <div class="info">
            <span class="title">{{ w.title }}</span>
            <span class="date">{{ fmt(w.createdAt) }} · {{ w.files.length }} 张</span>
          </div>
          <van-icon name="delete-o" class="del" @click="remove(w)" />
        </div>
      </div>
    </van-list>
  </div>
</template>

<style scoped>
.profile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 28px 20px 20px;
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.who {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.who span {
  font-size: 13px;
  color: var(--text-2);
}
h2 {
  font-size: 17px;
  margin: 8px 20px 4px;
}
.works {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 12px 16px;
}
.work {
  position: relative;
  background: var(--card);
  border-radius: 12px;
  overflow: hidden;
}
.work img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  background: #eee;
}
.info {
  display: flex;
  flex-direction: column;
  padding: 8px 10px 10px;
}
.title {
  font-size: 14px;
  font-weight: 500;
}
.date {
  font-size: 12px;
  color: var(--text-2);
}
.del {
  position: absolute;
  right: 8px;
  bottom: 12px;
  font-size: 18px;
  color: var(--text-2);
}
</style>
