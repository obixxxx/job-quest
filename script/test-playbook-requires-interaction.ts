/**
 * Test: Completing a playbook action should require logging an interaction
 */

import { db } from "../server/db";
import { playbookActions, interactions } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function testPlaybookRequiresInteraction() {
  console.log("Testing: Playbook action completion should link to interaction\n");

  // Find a completed playbook action
  const [completedAction] = await db
    .select()
    .from(playbookActions)
    .where(eq(playbookActions.status, "completed"))
    .limit(1);

  if (!completedAction) {
    console.log("⚠️  No completed playbook actions found");
    console.log("✅ TEST SKIPPED - No data to verify");
    process.exit(0);
  }

  console.log(`Found completed action: ${completedAction.actionLabel}`);
  console.log(`Action ID: ${completedAction.id}`);
  console.log(`Linked interaction ID: ${completedAction.interactionId || "NULL"}`);

  if (!completedAction.interactionId) {
    console.log("\n❌ TEST FAILED:");
    console.log("Completed playbook action has NO linked interaction");
    console.log("Expected: Every completed action should have an interactionId");
    process.exit(1);
  }

  // Verify the interaction exists
  const [interaction] = await db
    .select()
    .from(interactions)
    .where(eq(interactions.id, completedAction.interactionId))
    .limit(1);

  if (!interaction) {
    console.log("\n❌ TEST FAILED:");
    console.log("Interaction ID exists but interaction record not found");
    process.exit(1);
  }

  console.log(`\nLinked interaction found:`);
  console.log(`  Type: ${interaction.interactionType}`);
  console.log(`  Direction: ${interaction.direction}`);
  console.log(`  Date: ${interaction.interactionDate}`);

  console.log("\n✅ TEST PASSED:");
  console.log("Completed playbook action is properly linked to an interaction");

  process.exit(0);
}

testPlaybookRequiresInteraction().catch((error) => {
  console.error("Test error:", error);
  process.exit(1);
});
