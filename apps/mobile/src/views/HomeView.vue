<script setup lang="ts">
import { TEMPLATE_CATEGORIES, type TemplateCategory } from '@moments/shared';
import { computed, ref } from 'vue';
import TemplateThumb from '@/components/TemplateThumb.vue';
import { useTemplates } from '@/composables/useTemplates';

defineOptions({ name: 'HomeView' });

const { templates, loading, offline } = useTemplates();
const categories = Object.entries(TEMPLATE_CATEGORIES) as [TemplateCategory, string][];
const active = ref<TemplateCategory>('grid');

const list = computed(() =>
  templates.value.filter((t) => t.category === active.value).sort((a, b) => a.sort - b.sort),
);

const tips: Record<TemplateCategory, string> = {
  grid: '多张照片排成一张，整齐好看',
  collage: '主次分明的拼图，突出一张主角照',
  split: '一张照片切成多张，按顺序发出拼回完整大图',
  frame: '给单张照片加留白，朋友圈里不被裁切',
};
</script>

<template>
  <div class="page home">
    <header class="hero">
      <h1>朋友圈拼图</h1>
      <p>选个模板，放进照片，一键导出原图</p>
    </header>

    <van-tabs v-model:active="active" sticky shrink :offset-top="0" background="var(--bg)">
      <van-tab v-for="[key, label] in categories" :key="key" :name="key" :title="label" />
    </van-tabs>

    <p class="tip">{{ tips[active] }}</p>
    <van-notice-bar v-if="offline" left-icon="info-o" text="当前离线，正在使用内置模板" />

    <div v-if="loading" class="grid">
      <van-skeleton v-for="i in 6" :key="i" class="card" :row="0" />
    </div>
    <div v-else class="grid">
      <router-link
        v-for="t in list"
        :key="t.id"
        :to="{ name: 'editor', params: { code: t.code } }"
        class="card"
        :data-testid="`tpl-${t.code}`"
      >
        <div class="preview">
          <TemplateThumb :def="t.definition" />
        </div>
        <div class="meta">
          <span class="name">{{ t.name }}</span>
          <span class="count">{{ t.kind === 'split' ? `切 ${t.definition.slots.length} 张` : `${t.photoCount} 张` }}</span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.hero {
  padding: 28px 20px 12px;
}
.hero h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.hero p {
  margin: 6px 0 0;
  color: var(--text-2);
  font-size: 14px;
}
.tip {
  margin: 12px 20px 4px;
  font-size: 13px;
  color: var(--text-2);
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 12px 16px 24px;
}
.card {
  display: block;
  background: var(--card);
  border-radius: 14px;
  padding: 12px;
  color: inherit;
  text-decoration: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: transform 0.15s;
}
.card:active {
  transform: scale(0.97);
}
.preview {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border-radius: 10px;
  padding: 10px;
}
.meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 10px;
}
.name {
  font-size: 15px;
  font-weight: 600;
}
.count {
  font-size: 12px;
  color: var(--text-2);
}
</style>
