import { PrismaClient } from '@prisma/client';
import { PRESET_TEMPLATES, photoCountOf } from '@moments/shared';

const prisma = new PrismaClient();

/** 幂等：按 code upsert 内置模板，已存在的模板只更新定义，不覆盖运营调整过的上下架状态与排序 */
async function main() {
  for (const p of PRESET_TEMPLATES) {
    const data = {
      name: p.name,
      category: p.category,
      kind: p.definition.kind,
      photoCount: photoCountOf(p.definition),
      definition: p.definition as object,
    };
    await prisma.template.upsert({
      where: { code: p.code },
      update: data,
      create: { ...data, code: p.code, sort: p.sort, status: 'published' },
    });
  }
  console.log(`已同步 ${PRESET_TEMPLATES.length} 个内置模板`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
