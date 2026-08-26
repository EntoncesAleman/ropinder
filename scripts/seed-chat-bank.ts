import { prisma } from "../lib/prisma";
import { DEFAULT_CHAT_BANK } from "../lib/chatBank";

// Idempotent — safe to run more than once. Upserts by key/text so an admin's
// later edits (via /admin/chat) aren't clobbered on a second run; existing
// rows are left as the admin last set them, only missing ones are created.
async function main() {
  for (const cat of DEFAULT_CHAT_BANK) {
    const category = await prisma.chatCategory.upsert({
      where: { key: cat.key },
      create: { key: cat.key, label: cat.label, order: cat.order },
      update: {},
    });
    for (const q of cat.questions) {
      let question = await prisma.chatQuestion.findFirst({ where: { categoryId: category.id, text: q.text } });
      if (!question) {
        question = await prisma.chatQuestion.create({ data: { categoryId: category.id, text: q.text, order: q.order } });
      }
      for (const a of q.answers) {
        const existing = await prisma.chatAnswer.findFirst({ where: { questionId: question.id, text: a.text } });
        if (!existing) {
          await prisma.chatAnswer.create({ data: { questionId: question.id, text: a.text, order: a.order } });
        }
      }
    }
    console.log("Seeded category:", cat.label);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
