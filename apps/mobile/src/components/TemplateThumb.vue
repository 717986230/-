<script setup lang="ts">
import { canvasSize, slotToPixels, tileToPixels, type TemplateDefinition } from '@moments/shared';
import { computed } from 'vue';

const props = defineProps<{ def: TemplateDefinition }>();

const W = 100;
const view = computed(() => {
  const size = canvasSize(props.def, W);
  const isSplit = props.def.kind === 'split';
  const style = { ...props.def.style, gap: Math.max(props.def.style.gap, 0.02) };
  const rects = props.def.slots.map((s) => (isSplit ? tileToPixels(s, size) : slotToPixels(s, size, style)));
  return { size, rects, isSplit, radius: props.def.style.radius * W };
});
</script>

<template>
  <svg
    class="thumb"
    :viewBox="`0 0 ${view.size.width} ${view.size.height}`"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    <rect :width="view.size.width" :height="view.size.height" :fill="def.style.background" rx="2" />
    <template v-if="view.isSplit">
      <rect :width="view.size.width" :height="view.size.height" class="photo" rx="2" />
      <rect
        v-for="(r, i) in view.rects"
        :key="i"
        :x="r.x"
        :y="r.y"
        :width="r.w"
        :height="r.h"
        class="cut"
      />
    </template>
    <template v-else>
      <rect
        v-for="(r, i) in view.rects"
        :key="i"
        :x="r.x"
        :y="r.y"
        :width="r.w"
        :height="r.h"
        :rx="view.radius"
        class="photo"
      />
    </template>
  </svg>
</template>

<style scoped>
.thumb {
  display: block;
  width: 100%;
  height: 100%;
}
.photo {
  fill: var(--thumb-fill, #9fdcbc);
}
.cut {
  fill: none;
  stroke: #fff;
  stroke-width: 1.2;
  stroke-dasharray: 3 2;
}
</style>
