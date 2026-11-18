/** 模板类型：layout 把多张照片排进一张图；split 把一张照片切成多张（如九宫格切图） */
export type TemplateKind = 'layout' | 'split';

export type TemplateCategory = 'grid' | 'collage' | 'split' | 'frame';

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, string> = {
  grid: '宫格',
  collage: '拼图',
  split: '切图',
  frame: '留白边框',
};

/** 归一化矩形，坐标与宽高均为 0~1，相对于画布 */
export interface NormalizedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TemplateSlot extends NormalizedRect {
  id: string;
}

export interface TemplateStyle {
  /** 槽位间距，占画布宽度的比例 */
  gap: number;
  /** 外边距，占画布宽度的比例 */
  padding: number;
  /** 圆角，占画布宽度的比例 */
  radius: number;
  /** 背景色，CSS 颜色 */
  background: string;
}

export interface TemplateDefinition {
  version: 1;
  kind: TemplateKind;
  /** 宽 / 高 */
  aspectRatio: number;
  /** 导出宽度（像素） */
  baseWidth: number;
  /** layout：照片槽位；split：切片区域 */
  slots: TemplateSlot[];
  style: TemplateStyle;
}

export type TemplateStatus = 'draft' | 'published' | 'archived';

export interface TemplateDTO {
  id: string;
  code: string;
  name: string;
  category: TemplateCategory;
  kind: TemplateKind;
  /** 需要的照片张数 */
  photoCount: number;
  sort: number;
  status: TemplateStatus;
  definition: TemplateDefinition;
  createdAt: string;
  updatedAt: string;
}

/** 统一响应体 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  requestId?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 照片在槽位内的变换：scale ≥ 1 为放大；offset 取值 -1~1，表示可平移范围内的位置 */
export interface PhotoTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}
