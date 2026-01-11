import { db } from "../server/db";
import { playbookActions, templates } from "../shared/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";

async function testTemplateLinks() {
  console.log("Testing: Playbook actions should have template links\n");

  // Action types that SHOULD have templates (based on PLAYBOOK_TEMPLATE in routes.ts)
  const actionTypesThatNeedTemplates = [
    'initial_outreach',
    'follow_up_1',
    'follow_up_2',
    'follow_up_3',
    'execute_call',
    'ask_for_intro'
  ];

  // Count playbook actions with null templateId that SHOULD have templates
  const actionsWithoutTemplates = await db
    .select()
    .from(playbookActions)
    .where(
      and(
        isNull(playbookActions.templateId),
        inArray(playbookActions.actionType, actionTypesThatNeedTemplates)
      )
    );

  console.log(`Actions missing template links: ${actionsWithoutTemplates.length}`);

  if (actionsWithoutTemplates.length > 0) {
    console.log("\n❌ TEST FAILED - Actions exist without template links:");
    actionsWithoutTemplates.forEach(action => {
      console.log(`  - ${action.actionType} (ID: ${action.id})`);
    });
    process.exit(1);
  }

  console.log("\n✅ TEST PASSED - All playbook actions have template links");
  process.exit(0);
}

testTemplateLinks().catch((error) => {
  console.error("Test error:", error);
  process.exit(1);
});
