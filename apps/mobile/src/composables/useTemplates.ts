import { PRESET_TEMPLATES, photoCountOf, type TemplateDTO } from '@moments/shared';
import { ref } from 'vue';
import { templatesApi } from '@/api';

/** 内置模板转成与接口一致的结构，断网或服务不可用时兜底 */
export const fallbackTemplates: TemplateDTO[] = PRESET_TEMPLATES.map((p) => ({
  id: p.code,
  code: p.code,
  name: p.name,
  category: p.category,
  kind: p.definition.kind,
  photoCount: photoCountOf(p.definition),
  sort: p.sort,
  status: 'published',
  definition: p.definition,
  createdAt: '',
  updatedAt: '',
}));

const cache = ref<TemplateDTO[] | null>(null);

export function useTemplates() {
  const templates = ref<TemplateDTO[]>(cache.value ?? []);
  const loading = ref(!cache.value);
  const offline = ref(false);

  async function load() {
    try {
      const list = await templatesApi.list();
      cache.value = list.length ? list : fallbackTemplates;
      offline.value = false;
    } catch {
      cache.value = fallbackTemplates;
      offline.value = true;
    } finally {
      templates.value = cache.value!;
      loading.value = false;
    }
  }

  void load();
  return { templates, loading, offline, reload: load };
}

export async function getTemplate(code: string): Promise<TemplateDTO | undefined> {
  const hit = cache.value?.find((t) => t.code === code);
  if (hit) return hit;
  try {
    return await templatesApi.get(code);
  } catch {
    return fallbackTemplates.find((t) => t.code === code);
  }
}
