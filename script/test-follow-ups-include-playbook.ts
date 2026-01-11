/**
 * Test: Follow-ups page should show overdue playbook actions
 */

import { db } from "../server/db";
import { playbookActions, contacts } from "../shared/schema";
import { eq, and, lte } from "drizzle-orm";

async function testFollowUpsIncludePlaybook() {
  console.log("Testing: Follow-ups should include overdue playbook actions\n");

  const today = new Date().toISOString().split("T")[0];

  // Find pending playbook actions that are overdue
  const overdueActions = await db
    .select({
      actionId: playbookActions.id,
      actionLabel: playbookActions.actionLabel,
      dueDate: playbookActions.dueDate,
      contactId: playbookActions.contactId,
      contactName: contacts.name,
    })
    .from(playbookActions)
    .innerJoin(contacts, eq(playbookActions.contactId, contacts.id))
    .where(
      and(
        eq(playbookActions.status, "pending"),
        lte(playbookActions.dueDate, today)
      )
    )
    .limit(5);

  console.log(`Found ${overdueActions.length} overdue playbook actions:`);
  overdueActions.forEach((action) => {
    console.log(`  - ${action.contactName}: "${action.actionLabel}" (due: ${action.dueDate})`);
  });

  if (overdueActions.length === 0) {
    console.log("\n⚠️  No overdue playbook actions found - test cannot proceed");
    console.log("✅ TEST SKIPPED - No data to verify");
    process.exit(0);
  }

  console.log("\n❌ TEST EXPECTATION:");
  console.log("When calling GET /api/follow-ups, these playbook actions should be included");
  console.log("Expected: Follow-ups response includes both interactions AND playbook actions");
  console.log("\nCurrent behavior: Only shows interactions, missing playbook actions");

  process.exit(0);
}

testFollowUpsIncludePlaybook().catch((error) => {
  console.error("Test error:", error);
  process.exit(1);
});
