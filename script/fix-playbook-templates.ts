import { db } from "../server/db";
import { playbookActions, templates } from "../shared/schema";
import { eq, isNull, and } from "drizzle-orm";

// Template name mapping based on PLAYBOOK_TEMPLATE in routes.ts
const TEMPLATE_MAPPING = [
  { actionType: 'initial_outreach', templateName: 'Initial Outreach Email' },
  { actionType: 'follow_up_1', templateName: 'Follow-up #1 (Add Value)' },
  { actionType: 'follow_up_2', templateName: 'Follow-up #2 (Direct)' },
  { actionType: 'follow_up_3', templateName: 'Follow-up #3 (Final)' },
  { actionType: 'execute_call', templateName: 'Call Conversation Script' },
  { actionType: 'ask_for_intro', templateName: 'Ask for Introduction' },
];

async function fixPlaybookTemplates() {
  console.log("Fixing playbook actions with missing template links...\n");

  for (const mapping of TEMPLATE_MAPPING) {
    // Find the template by name
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.name, mapping.templateName))
      .limit(1);

    if (!template) {
      console.log(`⚠️  Template not found: ${mapping.templateName}`);
      continue;
    }

    // Update playbook actions with this actionType that have null templateId
    const result = await db
      .update(playbookActions)
      .set({ templateId: template.id })
      .where(
        and(
          eq(playbookActions.actionType, mapping.actionType),
          isNull(playbookActions.templateId)
        )
      )
      .returning();

    if (result.length > 0) {
      console.log(`✅ Updated ${result.length} '${mapping.actionType}' actions with template: ${mapping.templateName}`);
    }
  }

  console.log("\n✨ Template migration complete!");
  process.exit(0);
}

fixPlaybookTemplates().catch((error) => {
  console.error("Error fixing playbook templates:", error);
  process.exit(1);
});
