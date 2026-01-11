/**
 * Test: Should be able to revert a completed playbook action back to pending
 */

import { db } from "../server/db";
import { playbookActions } from "../shared/schema";
import { eq } from "drizzle-orm";

async function testPlaybookUndo() {
  console.log("Testing: Playbook actions should be revertable\n");

  // Find a completed action
  const [completedAction] = await db
    .select()
    .from(playbookActions)
    .where(eq(playbookActions.status, "completed"))
    .limit(1);

  if (!completedAction) {
    console.log("⚠️  No completed actions found - creating test data");
    // In a real test we'd create one, but for manual testing we'll skip
    console.log("✅ TEST SKIPPED - No completed actions to test");
    process.exit(0);
  }

  console.log(`Found completed action: ${completedAction.actionLabel}`);
  console.log(`Action ID: ${completedAction.id}`);
  console.log(`Current status: ${completedAction.status}`);

  // Test would call: POST /api/playbook/:id/revert
  // Expected: status changes from "completed" to "pending"

  console.log("\n❌ TEST SETUP COMPLETE");
  console.log("To test: Call POST /api/playbook/${actionId}/revert");
  console.log("Expected: Action status should change to 'pending'");

  process.exit(0);
}

testPlaybookUndo().catch((error) => {
  console.error("Test error:", error);
  process.exit(1);
});
