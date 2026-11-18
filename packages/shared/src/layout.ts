import type {
  NormalizedRect,
  PhotoTransform,
  PixelRect,
  TemplateDefinition,
  TemplateStyle,
} from './types';

const EPS = 1e-6;

export function canvasSize(def: TemplateDefinition, width = def.baseWidth) {
  return { width: Math.round(width), height: Math.round(width / def.aspectRatio) };
}

/**
 * 把归一化槽位换算成像素矩形，并应用外边距与间距。
 * 位于画布边界上的边只受外边距影响，内部的边各自内缩半个间距，保证所有间距一致。
 */
export function slotToPixels(
  slot: NormalizedRect,
  canvas: { width: number; height: number },
  style: Pick<TemplateStyle, 'gap' | 'padding'>,
): PixelRect {
  const pad = style.padding * canvas.width;
  const half = (style.gap * canvas.width) / 2;
  const cw = canvas.width - pad * 2;
  const ch = canvas.height - pad * 2;

  let left = pad + slot.x * cw;
  let top = pad + slot.y * ch;
  let right = pad + (slot.x + slot.w) * cw;
  let bottom = pad + (slot.y + slot.h) * ch;

  if (slot.x > EPS) left += half;
  if (slot.y > EPS) top += half;
  if (slot.x + slot.w < 1 - EPS) right -= half;
  if (slot.y + slot.h < 1 - EPS) bottom -= half;

  return { x: left, y: top, w: Math.max(0, right - left), h: Math.max(0, bottom - top) };
}

/** split 模板的切片不加间距与边距，直接按比例切 */
export function tileToPixels(slot: NormalizedRect, canvas: { width: number; height: number }): PixelRect {
  const x = Math.round(slot.x * canvas.width);
  const y = Math.round(slot.y * canvas.height);
  return {
    x,
    y,
    w: Math.round((slot.x + slot.w) * canvas.width) - x,
    h: Math.round((slot.y + slot.h) * canvas.height) - y,
  };
}

export const DEFAULT_TRANSFORM: PhotoTransform = { scale: 1, offsetX: 0, offsetY: 0 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * 计算以 cover 方式把图片铺满目标区域时，需要从原图裁取的源矩形。
 * transform.scale 进一步放大，offset 在可移动范围内平移（-1 最左/上，1 最右/下）。
 */
export function coverSourceRect(
  image: { width: number; height: number },
  target: { w: number; h: number },
  transform: PhotoTransform = DEFAULT_TRANSFORM,
): PixelRect {
  const scale = Math.max(1, transform.scale);
  const targetRatio = target.w / target.h;
  const imageRatio = image.width / image.height;

  let sw: number;
  let sh: number;
  if (imageRatio > targetRatio) {
    sh = image.height;
    sw = sh * targetRatio;
  } else {
    sw = image.width;
    sh = sw / targetRatio;
  }
  sw /= scale;
  sh /= scale;

  const freeX = image.width - sw;
  const freeY = image.height - sh;
  const ox = clamp(transform.offsetX, -1, 1);
  const oy = clamp(transform.offsetY, -1, 1);

  return { x: (freeX * (ox + 1)) / 2, y: (freeY * (oy + 1)) / 2, w: sw, h: sh };
}

/** 生成 rows × cols 的等分槽位 */
export function gridSlots(rows: number, cols: number) {
  const slots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({ id: `s${r * cols + c + 1}`, x: c / cols, y: r / rows, w: 1 / cols, h: 1 / rows });
    }
  }
  return slots;
}

/**
 * 拖动平移：把目标区域上的像素位移（dx, dy）换算为新的 offset。
 * 手指向右拖，画面跟着向右移动，即源矩形向左移动。
 */
export function panTransform(
  image: { width: number; height: number },
  target: { w: number; h: number },
  transform: PhotoTransform,
  dx: number,
  dy: number,
): PhotoTransform {
  const src = coverSourceRect(image, target, transform);
  const freeX = image.width - src.w;
  const freeY = image.height - src.h;
  const next = { ...transform };
  if (freeX > 0) next.offsetX = clamp(transform.offsetX - ((dx * src.w) / target.w) / (freeX / 2), -1, 1);
  if (freeY > 0) next.offsetY = clamp(transform.offsetY - ((dy * src.h) / target.h) / (freeY / 2), -1, 1);
  return next;
}

export const MAX_SCALE = 4;

export function zoomTransform(transform: PhotoTransform, scale: number): PhotoTransform {
  return { ...transform, scale: clamp(scale, 1, MAX_SCALE) };
}
