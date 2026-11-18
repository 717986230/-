import { gridSlots } from './layout';
import type { TemplateCategory, TemplateDefinition, TemplateSlot } from './types';

export interface TemplatePreset {
  code: string;
  name: string;
  category: TemplateCategory;
  sort: number;
  definition: TemplateDefinition;
}

const baseStyle = { gap: 0.008, padding: 0, radius: 0, background: '#ffffff' };

const layout = (aspectRatio: number, slots: TemplateSlot[], style = {}): TemplateDefinition => ({
  version: 1,
  kind: 'layout',
  aspectRatio,
  baseWidth: 1080,
  slots,
  style: { ...baseStyle, ...style },
});

const split = (rows: number, cols: number, aspectRatio = cols / rows): TemplateDefinition => ({
  version: 1,
  kind: 'split',
  aspectRatio,
  baseWidth: 1080 * cols > 3240 ? 3240 : 1080 * cols,
  slots: gridSlots(rows, cols),
  style: { gap: 0, padding: 0, radius: 0, background: '#ffffff' },
});

const s = (id: string, x: number, y: number, w: number, h: number): TemplateSlot => ({ id, x, y, w, h });

/** 内置模板：服务端用于初始化数据，移动端在离线时兜底 */
export const PRESET_TEMPLATES: TemplatePreset[] = [
  { code: 'grid-2x2', name: '四宫格', category: 'grid', sort: 10, definition: layout(1, gridSlots(2, 2)) },
  { code: 'grid-3x3', name: '九宫格', category: 'grid', sort: 20, definition: layout(1, gridSlots(3, 3)) },
  { code: 'grid-2x3', name: '六宫格', category: 'grid', sort: 30, definition: layout(3 / 2, gridSlots(2, 3)) },
  { code: 'grid-1x2', name: '左右双拼', category: 'grid', sort: 40, definition: layout(1, gridSlots(1, 2)) },
  { code: 'grid-2x1', name: '上下双拼', category: 'grid', sort: 50, definition: layout(3 / 4, gridSlots(2, 1)) },

  {
    code: 'collage-1l2r',
    name: '一大两小',
    category: 'collage',
    sort: 10,
    definition: layout(1, [s('s1', 0, 0, 2 / 3, 1), s('s2', 2 / 3, 0, 1 / 3, 0.5), s('s3', 2 / 3, 0.5, 1 / 3, 0.5)]),
  },
  {
    code: 'collage-1t3b',
    name: '上一下三',
    category: 'collage',
    sort: 20,
    definition: layout(3 / 4, [
      s('s1', 0, 0, 1, 2 / 3),
      s('s2', 0, 2 / 3, 1 / 3, 1 / 3),
      s('s3', 1 / 3, 2 / 3, 1 / 3, 1 / 3),
      s('s4', 2 / 3, 2 / 3, 1 / 3, 1 / 3),
    ]),
  },
  {
    code: 'collage-1c4',
    name: '中心焦点',
    category: 'collage',
    sort: 30,
    definition: layout(1, [
      s('s1', 0, 0, 0.5, 0.25),
      s('s2', 0.5, 0, 0.5, 0.25),
      s('s3', 0, 0.25, 1, 0.5),
      s('s4', 0, 0.75, 0.5, 0.25),
      s('s5', 0.5, 0.75, 0.5, 0.25),
    ]),
  },
  {
    code: 'collage-film',
    name: '胶片三连',
    category: 'collage',
    sort: 40,
    definition: layout(9 / 16, [s('s1', 0, 0, 1, 1 / 3), s('s2', 0, 1 / 3, 1, 1 / 3), s('s3', 0, 2 / 3, 1, 1 / 3)], {
      gap: 0.03,
      padding: 0.05,
      background: '#111111',
    }),
  },

  { code: 'split-3x3', name: '九宫格切图', category: 'split', sort: 10, definition: split(3, 3) },
  { code: 'split-2x2', name: '四宫格切图', category: 'split', sort: 20, definition: split(2, 2) },
  { code: 'split-1x3', name: '横向三连', category: 'split', sort: 30, definition: split(1, 3) },
  { code: 'split-2x3', name: '六宫格切图', category: 'split', sort: 40, definition: split(2, 3) },

  {
    code: 'frame-1x1',
    name: '方形留白',
    category: 'frame',
    sort: 10,
    definition: layout(1, [s('s1', 0, 0, 1, 1)], { padding: 0.06 }),
  },
  {
    code: 'frame-4x5',
    name: '4:5 留白',
    category: 'frame',
    sort: 20,
    definition: layout(4 / 5, [s('s1', 0, 0, 1, 1)], { padding: 0.06 }),
  },
  {
    code: 'frame-3x4-round',
    name: '3:4 圆角卡片',
    category: 'frame',
    sort: 30,
    definition: layout(3 / 4, [s('s1', 0, 0, 1, 1)], { padding: 0.08, radius: 0.04, background: '#f2efe9' }),
  },
];
