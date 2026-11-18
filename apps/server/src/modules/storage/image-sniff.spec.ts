import { sniffImage } from './image-sniff';

describe('sniffImage', () => {
  it('识别 PNG 尺寸', () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAYAAAC56t6BAAAAEklEQVR42mP8z8DwnxEJMCIzAEqKBQH0a4ELAAAAAElFTkSuQmCC',
      'base64',
    );
    expect(sniffImage(png)).toEqual({ ext: 'png', width: 2, height: 3 });
  });

  it('识别 JPEG SOF 段中的尺寸', () => {
    // SOI + APP0(长度 4) + SOF0(高 480 宽 640)
    const jpg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x02, 0x80, 0x03,
      0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    ]);
    expect(sniffImage(jpg)).toEqual({ ext: 'jpg', width: 640, height: 480 });
  });

  it('拒绝非图片内容', () => {
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
  });
});
