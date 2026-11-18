<script setup lang="ts">
import { showFailToast, showLoadingToast, showSuccessToast } from 'vant';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { worksApi } from '@/api';
import { blobToDataUrl, downloadBlob, isWeChat, shareFiles, zipBlobs } from '@/core/download';
import { useAuthStore } from '@/stores/auth';
import { useExportStore } from '@/stores/export';

const router = useRouter();
const store = useExportStore();
const auth = useAuthStore();

const srcs = ref<string[]>([]);
const saving = ref(false);
const saved = ref(false);
const inWeChat = isWeChat();

const template = computed(() => store.template);
const isSplit = computed(() => template.value?.kind === 'split');
const cols = computed(() => {
  const def = template.value?.definition;
  if (!def) return 1;
  return Math.round(1 / def.slots[0].w);
});
const canShare = typeof navigator !== 'undefined' && 'canShare' in navigator;

onMounted(async () => {
  if (!store.images.length) {
    router.replace('/');
    return;
  }
  srcs.value = await Promise.all(store.images.map((i) => blobToDataUrl(i.blob)));
});

const name = () => `${template.value?.name ?? '拼图'}-${Date.now().toString(36)}`;

async function onDownload() {
  const blobs = store.images.map((i) => i.blob);
  if (canShare && (await shareFiles(blobs, template.value?.name ?? '拼图').catch(() => false))) return;
  if (blobs.length === 1) return downloadBlob(blobs[0], `${name()}.jpg`);
  const toast = showLoadingToast({ message: '打包中…', duration: 0 });
  try {
    downloadBlob(await zipBlobs(blobs, name()), `${name()}.zip`);
  } finally {
    toast.close();
  }
}

async function onSave() {
  if (!auth.loggedIn) {
    router.push({ name: 'login', query: { redirect: '/result' } });
    return;
  }
  saving.value = true;
  try {
    await worksApi.create(
      template.value?.name ?? '我的作品',
      template.value?.code ?? '',
      store.images.map((i) => i.blob),
    );
    saved.value = true;
    showSuccessToast('已保存到我的作品');
  } catch (e) {
    showFailToast((e as Error).message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="result">
    <van-nav-bar title="完成" left-text="返回编辑" left-arrow @click-left="router.back()" />

    <section class="preview" :class="{ split: isSplit }" :style="{ '--cols': cols }">
      <figure v-for="(src, i) in srcs" :key="i" class="item">
        <img :src="src" :alt="`第 ${i + 1} 张`" />
        <figcaption v-if="isSplit">{{ i + 1 }}</figcaption>
      </figure>
    </section>

    <p class="tip">
      <template v-if="inWeChat">长按图片即可保存到相册</template>
      <template v-else-if="isSplit">发朋友圈时按 1→{{ srcs.length }} 的顺序选择图片</template>
      <template v-else>导出尺寸 {{ store.images[0]?.width }}×{{ store.images[0]?.height }}，朋友圈不压缩画质</template>
    </p>

    <div class="bar">
      <van-button v-if="!inWeChat" block round type="primary" data-testid="download" @click="onDownload">
        {{ srcs.length > 1 ? `保存全部 ${srcs.length} 张` : '保存图片' }}
      </van-button>
      <van-button block round plain type="primary" :loading="saving" :disabled="saved" @click="onSave">
        {{ saved ? '已保存到我的作品' : '保存到我的作品' }}
      </van-button>
    </div>
  </div>
</template>

<style scoped>
.result {
  min-height: 100vh;
  padding-bottom: calc(140px + var(--safe-bottom));
}
.preview {
  margin: 16px;
  display: grid;
  gap: 12px;
}
.preview.split {
  grid-template-columns: repeat(var(--cols), 1fr);
  gap: 4px;
}
.item {
  margin: 0;
  position: relative;
}
.item img {
  display: block;
  width: 100%;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  -webkit-touch-callout: default;
}
.item figcaption {
  position: absolute;
  top: 6px;
  left: 6px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
}
.tip {
  text-align: center;
  font-size: 13px;
  color: var(--text-2);
  margin: 4px 24px;
}
.bar {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px calc(12px + var(--safe-bottom));
  background: linear-gradient(to top, var(--bg) 70%, transparent);
}
</style>
