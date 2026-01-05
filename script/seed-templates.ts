import { db } from "../server/db";
import { templates } from "../shared/schema";
import { sql } from "drizzle-orm";

const DEFAULT_TEMPLATES = [
  {
    name: 'Initial Outreach Email',
    type: 'email' as const,
    subject: 'Quick question about [COMPANY/ROLE]',
    body: `Hi [NAME],

I came across your profile and noticed you're [THEIR ROLE] at [COMPANY]. I'm exploring opportunities in [YOUR FIELD] and had a quick question:

[ONE SPECIFIC QUESTION ABOUT THEIR WORK OR COMPANY]

Would you have 5-10 minutes for a brief call this week?

Thanks,
[YOUR NAME]`,
    isDefault: true,
  },
  {
    name: 'Follow-up #1 (Add Value)',
    type: 'follow_up' as const,
    subject: 'Re: Quick question about [COMPANY]',
    body: `Hi [NAME],

Wanted to follow up on my note from a few days ago. I came across [RELEVANT ARTICLE/INSIGHT] that made me think of [THEIR COMPANY/ROLE] - thought you might find it interesting.

Still happy to chat briefly if you have time this week.

Best,
[YOUR NAME]`,
    isDefault: true,
  },
  {
    name: 'Follow-up #2 (Direct)',
    type: 'follow_up' as const,
    subject: 'Following up',
    body: `Hi [NAME],

Just floating this back to the top of your inbox. I know you're busy - would a 10-minute call work better than email?

[YOUR NAME]`,
    isDefault: true,
  },
  {
    name: 'Follow-up #3 (Final)',
    type: 'follow_up' as const,
    subject: 'One last note',
    body: `Hi [NAME],

I'll keep this short - I don't want to be a pest. If now isn't a good time, no worries at all. But if you'd be open to a quick chat about [TOPIC], I'm happy to work around your schedule.

Either way, thanks for your time.

[YOUR NAME]`,
    isDefault: true,
  },
  {
    name: 'Call Conversation Script',
    type: 'call_script' as const,
    subject: null,
    body: `HOW TO RUN THE CALL:

1. START WITH CURIOSITY (first 10 min)
   - Ask about their role, what they're working on
   - Ask smart questions that show you researched their company
   - Let them talk 70% of the time

2. THE PIVOT (when rapport feels good)
   "I really appreciate you sharing all this. I've been thinking... given what you've described about [THEIR TEAM/CHALLENGES], I wonder if there might be a way I could add value. Would you be open to exploring that?"

3. HANDLE THEIR RESPONSE:
   - If YES: "Great - what would be the best next step?"
   - If HESITANT: "No pressure. Would it help if I sent over a short summary of my background?"
   - If NO: "Totally understand. Is there anyone else you think I should talk to?"

4. ALWAYS END WITH: "Who else should I be talking to?"`,
    isDefault: true,
  },
  {
    name: 'Ask for Introduction',
    type: 'call_script' as const,
    subject: null,
    body: `WHEN TO USE: After any good conversation.

THE ASK:
"This has been really helpful. One last question - is there anyone else you think I should talk to? Maybe someone in [TARGET FUNCTION] or at [TYPE OF COMPANY]?"

FOLLOW-UP:
"Would you be comfortable making an intro, or would you prefer I reach out directly and mention we spoke?"`,
    isDefault: true,
  },
];

async function seedTemplates() {
  console.log("Checking if templates need seeding...");
  
  const existingTemplates = await db.select().from(templates).limit(1);
  
  if (existingTemplates.length === 0) {
    console.log("Seeding default templates...");
    for (const template of DEFAULT_TEMPLATES) {
      await db.insert(templates).values(template);
    }
    console.log(`Seeded ${DEFAULT_TEMPLATES.length} default templates`);
  } else {
    console.log("Templates already exist, skipping seed");
  }
  
  process.exit(0);
}

seedTemplates().catch((error) => {
  console.error("Error seeding templates:", error);
  process.exit(1);
});
