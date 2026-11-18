<script setup lang="ts">
import {
  MAX_SCALE,
  panTransform,
  photoCountOf,
  zoomTransform,
  type TemplateDTO,
  type TemplateStyle,
} from '@moments/shared';
import { showConfirmDialog, showLoadingToast, showToast } from 'vant';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getTemplate } from '@/composables/useTemplates';
import { loadPhoto, releasePhoto } from '@/core/image';
import { emptySlots, exportImages, render, slotRects, type SlotState } from '@/core/renderer';
import { useExportStore } from '@/stores/export';

const props = defineProps<{ code: string }>();
const router = useRouter();
const exportStore = useExportStore();

const template = shallowRef<TemplateDTO | null>(null);
const style = ref<TemplateStyle>({ gap: 0, padding: 0, radius: 0, background: '#fff' });
const slots = shallowRef<SlotState[]>([]);
const selected = ref(0);
const showStyle = ref(false);
const busy = ref(false);

const canvasRef = ref<HTMLCanvasElement>();
const wrapRef = ref<HTMLDivElement>();
const fileRef = ref<HTMLInputElement>();
const cssWidth = ref(0);

const isSplit = computed(() => template.value?.kind === 'split');
const filled = computed(() => slots.value.filter((s) => s.photo).length);
const current = computed(() => slots.value[selected.value]);
const zoom = computed({
  get: () => current.value?.transform.scale ?? 1,
  set: (v: number) => updateSlot(selected.value, (s) => ({ ...s, transform: zoomTransform(s.transform, v) })),
});

const BACKGROUNDS = ['#ffffff', '#f2efe9', '#111111', '#fde2e4', '#dfe7fd', '#e2f0cb'];

onMounted(async () => {
  const t = await getTemplate(props.code);
  if (!t) {
    showToast('模板不存在或已下架');
    router.replace('/');
    return;
  }
  template.value = t;
  style.value = { ...t.definition.style };
  slots.value = emptySlots(photoCountOf(t.definition));
  await nextTick();
  observeSize();
});

let ro: ResizeObserver | null = null;
function observeSize() {
  if (!wrapRef.value) return;
  ro = new ResizeObserver(() => {
    const wrap = wrapRef.value!;
    const def = template.value!.definition;
    // 在可用区域内按模板比例尽量放大
    const maxW = wrap.clientWidth;
    const maxH = wrap.clientHeight;
    cssWidth.value = Math.floor(Math.min(maxW, maxH * def.aspectRatio));
    draw();
  });
  ro.observe(wrapRef.value);
}

let frame = 0;
function draw() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const canvas = canvasRef.value;
    const t = template.value;
    if (!canvas || !t || !cssWidth.value) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    render(canvas, {
      def: t.definition,
      style: style.value,
      slots: slots.value,
      width: cssWidth.value * dpr,
      editing: {
        selected: isSplit.value || filled.value === 0 || slots.value.length === 1 ? -1 : selected.value,
        placeholder: '#e9e9e9',
        accent: '#07c160',
      },
    });
    canvas.style.width = `${cssWidth.value}px`;
    canvas.style.height = `${cssWidth.value / t.definition.aspectRatio}px`;
  });
}

watch(style, draw, { deep: true });

function updateSlot(i: number, fn: (s: SlotState) => SlotState) {
  const next = slots.value.slice();
  next[i] = fn(next[i]);
  slots.value = next;
  draw();
}

/* ---------- 选图 ---------- */
let pickTarget = -1;
function pick(target: number) {
  pickTarget = target;
  const input = fileRef.value!;
  input.multiple = !isSplit.value && target < 0;
  input.value = '';
  input.click();
}

async function onFiles(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? []);
  if (!files.length) return;
  busy.value = true;
  const toast = showLoadingToast({ message: '读取照片…', forbidClick: true, duration: 0 });
  try {
    // 指定格子：替换该格；否则依次填入空位，空位不够则从选中格开始覆盖
    const targets: number[] = [];
    if (pickTarget >= 0) targets.push(pickTarget);
    else {
      slots.value.forEach((s, i) => !s.photo && targets.push(i));
      for (let i = 0; targets.length < files.length && i < slots.value.length; i++) {
        if (!targets.includes(i)) targets.push(i);
      }
    }
    const next = slots.value.slice();
    const list = files.slice(0, targets.length);
    let failed = 0;
    for (let k = 0; k < list.length; k++) {
      try {
        const photo = await loadPhoto(list[k]);
        const old = next[targets[k]].photo;
        if (old) releasePhoto(old);
        next[targets[k]] = { photo, transform: { scale: 1, offsetX: 0, offsetY: 0 } };
      } catch (err) {
        failed++;
        if (failed === 1) showToast((err as Error).message);
      }
    }
    slots.value = next;
    selected.value = targets[0] ?? 0;
    if (files.length > targets.length) showToast(`这个模板最多放 ${slots.value.length} 张，多出的已忽略`);
    draw();
  } finally {
    toast.close();
    busy.value = false;
  }
}

function removeCurrent() {
  const p = current.value?.photo;
  if (!p) return;
  releasePhoto(p);
  updateSlot(selected.value, () => ({ photo: null, transform: { scale: 1, offsetX: 0, offsetY: 0 } }));
}

/* ---------- 手势：点选、拖动、双指缩放 ---------- */
const pointers = new Map<number, { x: number; y: number }>();
let moved = false;
let pinchStart = 0;
let scaleStart = 1;

function hitTest(e: PointerEvent) {
  if (isSplit.value) return 0;
  const rect = canvasRef.value!.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const rects = slotRects(template.value!.definition, style.value, cssWidth.value);
  return rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

function dist() {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function onDown(e: PointerEvent) {
  canvasRef.value!.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    moved = false;
    const i = hitTest(e);
    if (i >= 0 && i !== selected.value) {
      selected.value = i;
      draw();
    }
  } else if (pointers.size === 2) {
    pinchStart = dist();
    scaleStart = current.value?.transform.scale ?? 1;
  }
}

function onMove(e: PointerEvent) {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  const dx = e.clientX - prev.x;
  const dy = e.clientY - prev.y;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (Math.abs(dx) + Math.abs(dy) > 0) moved = moved || Math.hypot(dx, dy) > 2;

  const s = current.value;
  if (!s?.photo) return;
  if (pointers.size === 2 && pinchStart > 0) {
    zoom.value = scaleStart * (dist() / pinchStart);
  } else if (pointers.size === 1) {
    const r = slotRects(template.value!.definition, style.value, cssWidth.value)[selected.value];
    const target = isSplit.value
      ? { w: cssWidth.value, h: cssWidth.value / template.value!.definition.aspectRatio }
      : r;
    updateSlot(selected.value, (st) => ({ ...st, transform: panTransform(st.photo!, target, st.transform, dx, dy) }));
  }
}

function onUp(e: PointerEvent) {
  const wasTap = pointers.size === 1 && !moved;
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStart = 0;
  if (wasTap) {
    const i = hitTest(e);
    if (i >= 0 && !slots.value[i].photo) pick(i);
  }
}

function onWheel(e: WheelEvent) {
  if (!current.value?.photo) return;
  e.preventDefault();
  zoom.value = zoom.value * (e.deltaY < 0 ? 1.08 : 0.92);
}

/* ---------- 导出 ---------- */
async function onExport() {
  const t = template.value!;
  if (filled.value === 0) {
    showToast('先添加照片吧');
    return;
  }
  const empty = slots.value.length - filled.value;
  if (empty > 0) {
    try {
      await showConfirmDialog({
        title: `还有 ${empty} 个空位`,
        message: '空位会显示为背景色，确定导出吗？',
        confirmButtonText: '导出',
        cancelButtonText: '继续添加',
      });
    } catch {
      return;
    }
  }
  busy.value = true;
  const toast = showLoadingToast({ message: '正在生成高清图…', forbidClick: true, duration: 0 });
  try {
    await new Promise((r) => setTimeout(r, 30)); // 让 loading 先渲染出来
    const results = await exportImages({ def: t.definition, style: style.value, slots: slots.value });
    exportStore.set(
      { ...t, definition: { ...t.definition, style: { ...style.value } } },
      results.map((r) => ({ ...r, url: URL.createObjectURL(r.blob) })),
    );
    router.push({ name: 'result' });
  } catch (err) {
    showToast((err as Error).message || '导出失败');
  } finally {
    toast.close();
    busy.value = false;
  }
}

onBeforeUnmount(() => {
  ro?.disconnect();
  cancelAnimationFrame(frame);
  slots.value.forEach((s) => s.photo && releasePhoto(s.photo));
});
</script>

<template>
  <div class="editor">
    <van-nav-bar
      :title="template?.name ?? '编辑'"
      left-arrow
      @click-left="router.back()"
    >
      <template #right>
        <van-button size="small" type="primary" round :disabled="busy" data-testid="export" @click="onExport">
          导出
        </van-button>
      </template>
    </van-nav-bar>

    <div ref="wrapRef" class="stage">
      <canvas
        ref="canvasRef"
        class="canvas"
        data-testid="canvas"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
        @wheel="onWheel"
      />
    </div>

    <p class="hint">
      <template v-if="filled === 0">点击格子或下方按钮添加照片</template>
      <template v-else-if="isSplit">拖动调整位置，双指缩放；导出后按 1→{{ template?.definition.slots.length }} 顺序发布</template>
      <template v-else>已放 {{ filled }}/{{ slots.length }} 张 · 拖动调整位置，双指缩放</template>
    </p>

    <div class="panel">
      <div v-if="current?.photo" class="zoom">
        <van-icon name="search" />
        <van-slider v-model="zoom" :min="1" :max="MAX_SCALE" :step="0.01" bar-height="4px" />
      </div>

      <div class="actions">
        <button class="action primary" data-testid="add-photos" @click="pick(-1)">
          <van-icon name="photo-o" />
          <span>{{ isSplit ? '选择照片' : '添加照片' }}</span>
        </button>
        <button class="action" :disabled="!current?.photo" @click="pick(selected)">
          <van-icon name="exchange" />
          <span>替换</span>
        </button>
        <button class="action" :disabled="!current?.photo" @click="removeCurrent">
          <van-icon name="delete-o" />
          <span>移除</span>
        </button>
        <button v-if="!isSplit" class="action" data-testid="style" @click="showStyle = true">
          <van-icon name="setting-o" />
          <span>样式</span>
        </button>
      </div>
    </div>

    <input ref="fileRef" type="file" accept="image/*" hidden data-testid="file-input" @change="onFiles" />

    <van-popup v-model:show="showStyle" position="bottom" round safe-area-inset-bottom>
      <div class="style-panel">
        <div class="row">
          <span>间距</span>
          <van-slider v-model="style.gap" :min="0" :max="0.05" :step="0.001" />
        </div>
        <div class="row">
          <span>边距</span>
          <van-slider v-model="style.padding" :min="0" :max="0.12" :step="0.002" />
        </div>
        <div class="row">
          <span>圆角</span>
          <van-slider v-model="style.radius" :min="0" :max="0.08" :step="0.002" />
        </div>
        <div class="row">
          <span>背景</span>
          <div class="swatches">
            <button
              v-for="c in BACKGROUNDS"
              :key="c"
              class="swatch"
              :class="{ on: style.background === c }"
              :style="{ background: c }"
              :aria-label="c"
              @click="style.background = c"
            />
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: #f0f0f0;
}
.stage {
  flex: 1;
  min-height: 0;
  margin: 16px 16px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.canvas {
  display: block;
  touch-action: none;
  border-radius: 4px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  background: #fff;
}
.hint {
  text-align: center;
  font-size: 12px;
  color: var(--text-2);
  margin: 12px 16px 8px;
}
.panel {
  background: #fff;
  border-radius: 18px 18px 0 0;
  padding: 14px 16px calc(14px + var(--safe-bottom));
}
.zoom {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 4px 6px 16px;
  color: var(--text-2);
}
.actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: 0;
  background: #f5f5f5;
  border-radius: 12px;
  padding: 10px 0;
  font-size: 12px;
  color: var(--text);
}
.action .van-icon {
  font-size: 22px;
}
.action.primary {
  background: var(--brand);
  color: #fff;
}
.action:disabled {
  opacity: 0.4;
}
.style-panel {
  padding: 20px 20px 12px;
}
.row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 44px;
}
.row > span {
  width: 32px;
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text-2);
}
.swatches {
  display: flex;
  gap: 10px;
}
.swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid #ddd;
  padding: 0;
}
.swatch.on {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
</style>
