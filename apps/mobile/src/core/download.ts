/** 微信内置浏览器不支持 blob 链接长按保存，展示时转为 data URL */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export const isWeChat = () => /MicroMessenger/i.test(navigator.userAgent);

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** 系统分享（iOS/Android 浏览器支持时可直接存到相册或分享到微信） */
export async function shareFiles(blobs: Blob[], title: string) {
  const files = blobs.map((b, i) => new File([b], `${title}-${i + 1}.jpg`, { type: 'image/jpeg' }));
  if (!navigator.canShare?.({ files })) return false;
  try {
    await navigator.share({ files, title });
  } catch (e) {
    // 用户取消分享不算失败
    if ((e as Error).name !== 'AbortError') throw e;
  }
  return true;
}

export async function zipBlobs(blobs: Blob[], prefix: string) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  blobs.forEach((b, i) => zip.file(`${prefix}-${String(i + 1).padStart(2, '0')}.jpg`, b));
  return zip.generateAsync({ type: 'blob' });
}
