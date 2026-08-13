/**
 * Sprint 0 validation spike — AI/Intelligence spec §75 (test data strategy),
 * TRD §97 (AI test cases).
 *
 * Run: GROQ_API_KEY=your_key node tests/test-idea-structuring.js
 *
 * Purpose: confirm the idea-structuring engine reliably returns valid,
 * non-hallucinated structured output across a range of REAL messy input —
 * not cherry-picked clean examples. This is the gate for the rest of the
 * gap-diagnosis pipeline being trustworthy.
 */

const { structureIdea } = require('../backend/ai/ideaStructuring');

const TEST_IDEAS = [
  {
    label: 'Clear, well-specified idea',
    text: "I want to build an app where small restaurants can predict how much food they will need each day so that they don't waste inventory. It would use their past sales data and maybe weather data to forecast demand."
  },
  {
    label: 'Vague, casual idea (realistic founder input)',
    text: "so basically i want to make something like uber but for like helping old people with small chores around the house idk if thats a real business yet"
  },
  {
    label: 'Technical-heavy, business-vague idea',
    text: "Building a computer vision pipeline that does real-time defect detection on manufacturing lines using a fine-tuned YOLO model deployed on edge devices."
  },
  {
    label: 'Extremely short / underspecified',
    text: "AI for healthcare"
  },
  {
    label: 'Business-heavy, tech-vague idea',
    text: "We're launching a subscription box for sustainable fashion targeting Gen Z women in tier-2 Indian cities, partnering with local designers instead of mass manufacturing."
  }
];

async function run() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('Set GROQ_API_KEY environment variable first.');
    console.error('Example: GROQ_API_KEY=gsk_xxxxx node tests/test-idea-structuring.js');
    process.exit(1);
  }

  let passCount = 0;

  for (const [i, testCase] of TEST_IDEAS.entries()) {
    console.log('\n' + '='.repeat(70));
    console.log(`TEST ${i + 1}/${TEST_IDEAS.length}: ${testCase.label}`);
    console.log('='.repeat(70));
    console.log(`Input: "${testCase.text}"\n`);

    const result = await structureIdea(testCase.text, apiKey);

    if (result.success) {
      passCount++;
      console.log('✅ VALID structured output:');
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ FAILED validation:');
      console.log('Errors:', result.errors);
      if (result.rawResponse) console.log('Raw response:', result.rawResponse.slice(0, 500));
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`RESULT: ${passCount}/${TEST_IDEAS.length} test ideas produced valid structured output.`);
  console.log('Sprint 0 gate requires >= 4/5 to pass.');
  console.log('='.repeat(70));
}

run();
