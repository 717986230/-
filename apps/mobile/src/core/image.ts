/** 编辑时使用的照片：原图解码后按上限缩放，兼顾清晰度与手机内存 */
export interface LoadedPhoto {
  id: string;
  source: CanvasImageSource;
  width: number;
  height: number;
  /** 用于缩略图展示 */
  previewUrl: string;
}

/** 单边上限：朋友圈原图最大约 4096 像素，再大只会浪费内存 */
const MAX_EDGE = 4096;
let seq = 0;

export async function loadPhoto(file: File): Promise<LoadedPhoto> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error('请选择图片文件');
  }
  let bitmap: ImageBitmap;
  try {
    // 现代浏览器默认按 EXIF 方向解码，避免手机竖拍照片变横
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('这张图片无法读取，可能是 HEIC 格式，请在相册中转为 JPG 后再试');
  }

  const ratio = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  let source: CanvasImageSource = bitmap;
  let width = bitmap.width;
  let height = bitmap.height;
  if (ratio < 1) {
    width = Math.round(bitmap.width * ratio);
    height = Math.round(bitmap.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    source = canvas;
  }

  return { id: `p${++seq}`, source, width, height, previewUrl: URL.createObjectURL(file) };
}

export function releasePhoto(p: LoadedPhoto) {
  URL.revokeObjectURL(p.previewUrl);
  if (typeof ImageBitmap !== 'undefined' && p.source instanceof ImageBitmap) p.source.close();
}
