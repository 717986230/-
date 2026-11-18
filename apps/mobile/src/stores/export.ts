import type { TemplateDTO } from '@moments/shared';
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

export interface ExportedImage {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

/** 编辑页导出结果，交给结果页展示、下载或保存 */
export const useExportStore = defineStore('export', () => {
  const template = shallowRef<TemplateDTO | null>(null);
  const images = shallowRef<ExportedImage[]>([]);

  function set(t: TemplateDTO, list: ExportedImage[]) {
    clear();
    template.value = t;
    images.value = list;
  }

  function clear() {
    images.value.forEach((i) => URL.revokeObjectURL(i.url));
    images.value = [];
    template.value = null;
  }

  return { template, images, set, clear };
});
