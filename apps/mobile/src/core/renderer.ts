import {
  canvasSize,
  coverSourceRect,
  DEFAULT_TRANSFORM,
  slotToPixels,
  tileToPixels,
  type PhotoTransform,
  type PixelRect,
  type TemplateDefinition,
  type TemplateStyle,
} from '@moments/shared';
import type { LoadedPhoto } from './image';

export interface SlotState {
  photo: LoadedPhoto | null;
  transform: PhotoTransform;
}

export interface RenderOptions {
  def: TemplateDefinition;
  style: TemplateStyle;
  slots: SlotState[];
  /** 输出宽度（像素） */
  width: number;
  /** 编辑态：空槽位显示占位，选中槽位描边 */
  editing?: { selected: number; placeholder: string; accent: string };
}

/** 计算每个槽位在指定宽度画布上的像素矩形（编辑时的点击检测与渲染共用） */
export function slotRects(def: TemplateDefinition, style: TemplateStyle, width: number): PixelRect[] {
  const canvas = canvasSize(def, width);
  return def.kind === 'split'
    ? def.slots.map((s) => tileToPixels(s, canvas))
    : def.slots.map((s) => slotToPixels(s, canvas, style));
}

function roundRect(ctx: CanvasRenderingContext2D, r: PixelRect, radius: number) {
  ctx.beginPath();
  if (radius <= 0) {
    ctx.rect(r.x, r.y, r.w, r.h);
    return;
  }
  const rad = Math.min(radius, r.w / 2, r.h / 2);
  ctx.roundRect(r.x, r.y, r.w, r.h, rad);
}

function drawPhoto(ctx: CanvasRenderingContext2D, photo: LoadedPhoto, t: PhotoTransform, rect: PixelRect) {
  const src = coverSourceRect(photo, rect, t);
  ctx.drawImage(photo.source, src.x, src.y, src.w, src.h, rect.x, rect.y, rect.w, rect.h);
}

/** 把模板渲染到 canvas 上；split 模板渲染为整张大图（切片前的效果） */
export function render(canvas: HTMLCanvasElement, opts: RenderOptions) {
  const { def, style, slots, width, editing } = opts;
  const size = canvasSize(def, width);
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = style.background;
  ctx.fillRect(0, 0, size.width, size.height);

  if (def.kind === 'split') {
    const s = slots[0];
    const full = { x: 0, y: 0, w: size.width, h: size.height };
    if (s?.photo) drawPhoto(ctx, s.photo, s.transform, full);
    else if (editing) drawPlaceholder(ctx, full, editing.placeholder);
    if (editing) drawSplitGuides(ctx, slotRects(def, style, width), Math.max(1, width / 360));
    return canvas;
  }

  const rects = slotRects(def, style, width);
  const radius = style.radius * size.width;
  rects.forEach((rect, i) => {
    const state = slots[i];
    ctx.save();
    roundRect(ctx, rect, radius);
    ctx.clip();
    if (state?.photo) drawPhoto(ctx, state.photo, state.transform, rect);
    else if (editing) drawPlaceholder(ctx, rect, editing.placeholder);
    ctx.restore();

    if (editing && editing.selected === i) {
      const lw = Math.max(2, width / 180);
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = editing.accent;
      roundRect(ctx, { x: rect.x + lw / 2, y: rect.y + lw / 2, w: rect.w - lw, h: rect.h - lw }, radius);
      ctx.stroke();
      ctx.restore();
    }
  });
  return canvas;
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, rect: PixelRect, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const size = Math.min(rect.w, rect.h) * 0.18;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = Math.max(1.5, size / 8);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - size / 2, cy);
  ctx.lineTo(cx + size / 2, cy);
  ctx.moveTo(cx, cy - size / 2);
  ctx.lineTo(cx, cy + size / 2);
  ctx.stroke();
}

function drawSplitGuides(ctx: CanvasRenderingContext2D, tiles: PixelRect[], lw: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = lw;
  ctx.setLineDash([lw * 4, lw * 3]);
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = lw * 2;
  for (const t of tiles) ctx.strokeRect(t.x, t.y, t.w, t.h);
  ctx.restore();
}

export interface ExportResult {
  blob: Blob;
  width: number;
  height: number;
}

function toBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('导出失败，图片可能过大'))), 'image/jpeg', quality),
  );
}

/** 导出：layout 输出一张图；split 先渲染整图，再按切片区域裁成多张 */
export async function exportImages(opts: Omit<RenderOptions, 'editing' | 'width'>): Promise<ExportResult[]> {
  const { def, style } = opts;
  const full = render(document.createElement('canvas'), { ...opts, width: def.baseWidth });
  if (def.kind === 'layout') {
    return [{ blob: await toBlob(full), width: full.width, height: full.height }];
  }

  const tiles = slotRects(def, style, def.baseWidth);
  const out: ExportResult[] = [];
  for (const t of tiles) {
    const c = document.createElement('canvas');
    c.width = t.w;
    c.height = t.h;
    c.getContext('2d')!.drawImage(full, t.x, t.y, t.w, t.h, 0, 0, t.w, t.h);
    out.push({ blob: await toBlob(c), width: t.w, height: t.h });
  }
  return out;
}

export const emptySlots = (n: number): SlotState[] =>
  Array.from({ length: n }, () => ({ photo: null, transform: { ...DEFAULT_TRANSFORM } }));
