import type { TemplateDefinition } from './types';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const EPS = 1e-6;

/** 校验模板定义，返回错误列表；空数组表示合法。前后端共用同一套规则。 */
export function validateDefinition(input: unknown): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') return ['definition 必须是对象'];
  const def = input as Partial<TemplateDefinition>;

  if (def.version !== 1) errors.push('version 必须为 1');
  if (def.kind !== 'layout' && def.kind !== 'split') errors.push('kind 必须为 layout 或 split');
  if (!isNum(def.aspectRatio) || def.aspectRatio < 0.1 || def.aspectRatio > 10)
    errors.push('aspectRatio 必须在 0.1~10 之间');
  if (!isNum(def.baseWidth) || def.baseWidth < 320 || def.baseWidth > 6000)
    errors.push('baseWidth 必须在 320~6000 之间');

  const style = def.style;
  if (!style || typeof style !== 'object') {
    errors.push('style 缺失');
  } else {
    for (const key of ['gap', 'padding', 'radius'] as const) {
      if (!isNum(style[key]) || style[key] < 0 || style[key] > 0.2) errors.push(`style.${key} 必须在 0~0.2 之间`);
    }
    if (typeof style.background !== 'string' || style.background.length > 64)
      errors.push('style.background 必须是颜色字符串');
  }

  if (!Array.isArray(def.slots) || def.slots.length === 0 || def.slots.length > 25) {
    errors.push('slots 必须包含 1~25 个槽位');
    return errors;
  }
  const ids = new Set<string>();
  def.slots.forEach((s, i) => {
    if (!s || typeof s.id !== 'string' || !s.id) errors.push(`slots[${i}].id 缺失`);
    else if (ids.has(s.id)) errors.push(`slots[${i}].id 重复：${s.id}`);
    else ids.add(s.id);
    const ok = [s?.x, s?.y, s?.w, s?.h].every(isNum);
    if (!ok) {
      errors.push(`slots[${i}] 坐标必须为数字`);
      return;
    }
    if (s.x < -EPS || s.y < -EPS || s.w <= 0 || s.h <= 0 || s.x + s.w > 1 + EPS || s.y + s.h > 1 + EPS)
      errors.push(`slots[${i}] 超出画布范围`);
  });
  return errors;
}

/** layout 模板需要的照片数 = 槽位数；split 模板只需 1 张 */
export function photoCountOf(def: TemplateDefinition) {
  return def.kind === 'split' ? 1 : def.slots.length;
}
