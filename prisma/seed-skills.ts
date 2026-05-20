/**
 * Сид навыков, алиасов и связей.
 * Запуск: npx tsx prisma/seed-skills.ts
 *
 * Идемпотентно: можно перезапускать.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { SKILL_GROUPS } from "../lib/skills-data";
import { SKILL_ALIASES, SKILL_RELATIONS } from "../lib/skills-graph";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("→ Сидим Skill записи с категориями…");
  for (const group of SKILL_GROUPS) {
    for (const name of group.skills) {
      await prisma.skill.upsert({
        where: { name },
        update: { category: group.category },
        create: { name, category: group.category },
      });
    }
  }
  const totalSkills = await prisma.skill.count();
  console.log(`  ${totalSkills} навыков в базе`);

  console.log("→ Сидим алиасы…");
  let aliasesAdded = 0;
  for (const { canonical, aliases } of SKILL_ALIASES) {
    const skill = await prisma.skill.findUnique({ where: { name: canonical } });
    if (!skill) {
      console.warn(`  ⚠ Канонический навык не найден: ${canonical}`);
      continue;
    }
    for (const alias of aliases) {
      const lower = alias.toLowerCase();
      await prisma.skillAlias.upsert({
        where: { alias: lower },
        update: { skillId: skill.id },
        create: { skillId: skill.id, alias: lower },
      });
      aliasesAdded++;
    }
  }
  console.log(`  ${aliasesAdded} алиасов`);

  console.log("→ Сидим граф связей…");
  let relationsAdded = 0;
  for (const { from, to, weight } of SKILL_RELATIONS) {
    const fromSkill = await prisma.skill.findUnique({ where: { name: from } });
    const toSkill = await prisma.skill.findUnique({ where: { name: to } });
    if (!fromSkill || !toSkill) {
      console.warn(`  ⚠ Пропускаю связь ${from} → ${to} (один из навыков не найден)`);
      continue;
    }
    await prisma.skillRelation.upsert({
      where: { fromId_toId: { fromId: fromSkill.id, toId: toSkill.id } },
      update: { weight },
      create: { fromId: fromSkill.id, toId: toSkill.id, weight },
    });
    relationsAdded++;
  }
  console.log(`  ${relationsAdded} связей`);

  console.log("✓ Готово");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
