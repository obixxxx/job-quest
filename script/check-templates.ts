import { db } from "../server/db";
import { templates } from "../shared/schema";

async function checkTemplates() {
  const result = await db.select().from(templates);
  console.log(`Found ${result.length} templates:`);
  result.forEach(t => {
    console.log(`- ${t.name} (isDefault: ${t.isDefault}, userId: ${t.userId})`);
  });
  process.exit(0);
}

checkTemplates().catch(error => {
  console.error(error);
  process.exit(1);
});
