import { describe, expect, it } from 'vitest';
import { canvasSize, coverSourceRect, gridSlots, slotToPixels, tileToPixels } from './layout';
import { PRESET_TEMPLATES } from './presets';
import { photoCountOf, validateDefinition } from './validate';

describe('slotToPixels', () => {
  const canvas = { width: 1000, height: 1000 };

  it('无间距无边距时等于按比例换算', () => {
    expect(slotToPixels({ x: 0.5, y: 0, w: 0.5, h: 0.5 }, canvas, { gap: 0, padding: 0 })).toEqual({
      x: 500, y: 0, w: 500, h: 500,
    });
  });

  it('内部边内缩半个间距，边界边只受外边距影响', () => {
    const style = { gap: 0.02, padding: 0.05 };
    const left = slotToPixels({ x: 0, y: 0, w: 0.5, h: 1 }, canvas, style);
    const right = slotToPixels({ x: 0.5, y: 0, w: 0.5, h: 1 }, canvas, style);
    expect(left.x).toBeCloseTo(50);
    expect(right.x - (left.x + left.w)).toBeCloseTo(20); // 间距 = gap
    expect(right.x + right.w).toBeCloseTo(950);
    expect(left.w).toBeCloseTo(right.w);
  });
});

describe('tileToPixels', () => {
  it('3x3 切片无缝覆盖整个画布', () => {
    const canvas = { width: 1001, height: 1001 };
    const tiles = gridSlots(3, 3).map((t) => tileToPixels(t, canvas));
    const area = tiles.reduce((sum, t) => sum + t.w * t.h, 0);
    expect(area).toBe(1001 * 1001);
  });
});

describe('coverSourceRect', () => {
  it('横图放进方框时裁掉左右，默认居中', () => {
    const r = coverSourceRect({ width: 2000, height: 1000 }, { w: 100, h: 100 });
    expect(r).toEqual({ x: 500, y: 0, w: 1000, h: 1000 });
  });

  it('offset=-1 时靠左，scale=2 时取一半区域', () => {
    const r = coverSourceRect({ width: 2000, height: 1000 }, { w: 100, h: 100 }, { scale: 2, offsetX: -1, offsetY: 1 });
    expect(r).toEqual({ x: 0, y: 500, w: 500, h: 500 });
  });

  it('scale 小于 1 时按 1 处理，不会出现空白', () => {
    const r = coverSourceRect({ width: 1000, height: 1000 }, { w: 100, h: 50 }, { scale: 0.5, offsetX: 0, offsetY: 0 });
    expect(r.w).toBe(1000);
    expect(r.h).toBe(500);
  });
});

describe('presets', () => {
  it('所有内置模板都能通过校验，code 唯一', () => {
    const codes = new Set<string>();
    for (const p of PRESET_TEMPLATES) {
      expect(validateDefinition(p.definition), p.code).toEqual([]);
      expect(codes.has(p.code)).toBe(false);
      codes.add(p.code);
    }
  });

  it('canvasSize 与照片数量', () => {
    const nine = PRESET_TEMPLATES.find((p) => p.code === 'grid-3x3')!.definition;
    expect(canvasSize(nine)).toEqual({ width: 1080, height: 1080 });
    expect(photoCountOf(nine)).toBe(9);
    const split = PRESET_TEMPLATES.find((p) => p.code === 'split-3x3')!.definition;
    expect(photoCountOf(split)).toBe(1);
  });
});

describe('validateDefinition', () => {
  it('拒绝越界槽位和重复 id', () => {
    const errors = validateDefinition({
      version: 1,
      kind: 'layout',
      aspectRatio: 1,
      baseWidth: 1080,
      style: { gap: 0, padding: 0, radius: 0, background: '#fff' },
      slots: [
        { id: 'a', x: 0.6, y: 0, w: 0.5, h: 1 },
        { id: 'a', x: 0, y: 0, w: 0.5, h: 1 },
      ],
    });
    expect(errors).toContain('slots[0] 超出画布范围');
    expect(errors).toContain('slots[1].id 重复：a');
  });

  it('拒绝非对象输入', () => {
    expect(validateDefinition(null)).toEqual(['definition 必须是对象']);
  });
});
