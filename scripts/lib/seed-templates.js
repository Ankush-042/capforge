/**
 * Every piece of scripted text the seeding scripts write.
 *
 * WHY THIS FILE EXISTS. seed-history.js held these inline, and the repair
 * script needed the exact same strings to find what it had written. Two copies
 * of a literal is how a repair silently stops matching what it is repairing:
 * one character of drift and it finds nothing, reports success, and leaves the
 * mess in place. There is one copy now and both scripts read it.
 *
 * The ORIGINALS must never be edited. They are what is already in the
 * database, and the repair matches on them exactly. Changing a word here
 * orphans every row that was written with the old wording.
 */

// The sender pattern for every deep exchange: contributor, founder, alternating.
// The silence falls after index 5, so index 6 is always somebody returning.
const QUIET_AFTER = 5;

const DEEP_EXCHANGE = [
  ['C', "Following up properly now that I have had time to read everything on {venture}. I have questions before I say anything that sounds like a commitment."],
  ['F', "Ask them. I would rather lose you now than six months in."],
  ['C', "How many hours a week are you actually expecting? Not the pitch version."],
  ['F', "Honestly, twenty to start. More once we know the thing works. I am not going to pretend it stays part-time forever."],
  ['C', "That works for now. What I need clarity on is what happens if it does work and I am still on twenty."],
  ['F', "Then we renegotiate, in writing, before it turns into resentment. I have watched exactly that end a company."],
  ['C', "Sorry, went quiet. Had a week at my current job that ate everything. Still very interested."],
  ['F', "No apology needed. Honestly it told me something useful, that you would say so rather than disappear."],
  ['C', "Can we talk equity before going further? Not to haggle, just so neither of us is guessing."],
  ['F', "Yes. I would rather it be awkward now than later. What were you thinking?"],
  ['C', "I looked at the range the calculator here suggested and it seemed fair. Somewhere in there, with a normal vesting schedule."],
  ['F', "That is close to what I had in mind. Let us get on a call this week and write it down."],
];

/** Different conversations, same rhythm. Each keeps the C/F pattern above. */
const DEEP_VARIANTS = [
  [
    "I have read everything on {venture} twice now. Before I say anything that sounds like a yes, I want to understand what you expect week to week.",
    "Fair. I would rather answer that now than have you find out in month three.",
    "Is this a full-time ask, or can it start alongside what I am doing?",
    "It can start alongside. I am not going to pretend that works forever, but for the first couple of months it is realistic.",
    "And if I am the one holding a piece of it when that stops being realistic?",
    "Then we have the conversation properly, with numbers, not hints.",
    "Sorry for the silence. I was interviewing somewhere else and wanted to be honest with myself before replying.",
    "I appreciate you saying that rather than going quiet permanently. Where did you land?",
    "Here. But I want the equity conversation before I start, not after.",
    "Agreed. I would rather it be uncomfortable now.",
    "Then let us put a number on paper this week and see if we both still feel fine about it.",
    "Sending you what I had in mind tonight. Tear it apart if it is wrong.",
  ],
  [
    "Had a proper look at {venture} over the weekend. Most of my questions are about the technical state, not the idea.",
    "Ask. The idea is the easy part to defend.",
    "How much of what exists is real, and how much is a prototype you would throw away?",
    "Roughly a third is real. The rest was built to find out whether that third was worth building.",
    "That is a better answer than most. What breaks first if this works?",
    "Data. We have no plan for volume and I know it.",
    "Went quiet, sorry, I was deep in a release at work. Still thinking about the volume problem.",
    "Take your time. I would rather you came in having thought about it than enthusiastic and surprised later.",
    "I think it is solvable, but not by one person doing it alongside a job.",
    "Which is the honest reason I am looking for someone rather than doing it myself.",
    "Then we should talk about what the first ninety days actually look like.",
    "Let us do that on a call. I will bring a plan you can disagree with.",
  ],
  [
    "I keep coming back to {venture} and I cannot tell whether that is genuine interest or just that I want to leave my current job.",
    "That is a more useful thing to say out loud than most people manage.",
    "So let me test it. Why is this worth years rather than a side project?",
    "Because the people it is for cannot wait for somebody to get around to it eventually.",
    "Do you have anything showing they want it, or is that conviction?",
    "Some of both. Two of them chased me for an update, which I did not expect.",
    "Apologies for disappearing for a week. Family thing, nothing dramatic.",
    "No problem at all. The offer does not have a clock on it.",
    "Good, because my honest answer is that I am close but not certain.",
    "Close and honest beats certain and wrong. What would move you?",
    "Seeing one of those people say it in their own words.",
    "I can arrange that. Give me a few days.",
  ],
];

const INVESTOR_OPENER = "I have been following {venture} since it crossed the readiness bar. Before anything else: what is the part you are least sure about?";
const FOUNDER_REPLY = "Distribution. The product question I think we can answer. Getting in front of the people who actually need it is the thing I lose sleep over.";
const PITCH_NOTE = "Here is the full picture, including that.";
const INVESTOR_AFTER = "That is a more honest answer than I usually get. I have read it. Can you walk me through the next ninety days on a call?";

const INVESTOR_VARIANTS = [
  {
    opener: "Came across {venture} in my deal flow and read it properly rather than skimming. What would have to be true in a year for this to have worked?",
    reply: "That the people we built it for use it without us in the room. Everything else follows from that.",
    note: "The full picture, including the parts I am less sure about.",
    after: "Useful. I would like to understand how you think about the first hires before we talk numbers.",
  },
  {
    opener: "I have been watching {venture} for a few weeks. Rather than a pitch, tell me what you would spend the next cheque on.",
    reply: "Distribution, and the person who owns it. The product we can keep improving ourselves.",
    note: "Everything written down, including the risks.",
    after: "That matches what I hoped you would say. Can we find thirty minutes this week?",
  },
];

const EXTRA_RESONANCES = [
  "I have been circling this exact problem for about a year without doing anything about it. Seeing someone else write it down properly made me want to stop circling.",
  "I am not sure I am the right fit for what you described, but I have worked adjacent to this for four years and I would like to at least talk it through.",
];

const RESONANCE_VARIANTS = [
  [
    "This is the part of the problem I have actually worked on, and I have opinions about why the obvious fix does not work. Happy to share them either way.",
    "I am on the fence about the framing, but the underlying problem is one I have wanted to work on for years. I would rather argue about it with you than from the outside.",
  ],
  [
    "I tried something close to this at a previous company and it failed for reasons I do not think were inevitable. That is why I am writing.",
    "Not certain I am who you need, but I have watched this problem from the customer side for a long time and that might be worth something.",
  ],
];

const REWRITE_SUFFIX = "\n\nTo be more specific about what I mean: the first version would be deliberately small, one problem, for one kind of customer, and I would rather prove that than describe the whole vision.";

const REWRITE_VARIANTS = [
  "\n\nRewriting this because the first version buried the point. What I am certain about is the problem, not the solution. If you disagree with how I have framed the fix, that is exactly the conversation I want.",
  "\n\nOne clarification after some feedback: I am not proposing to build everything described here at once. The first version would be narrow enough to be wrong quickly.",
];

const QUIET_SPARK = {
  title: 'Small clinics throw away most of the data they collect',
  theIdea: "Every small clinic I have worked with records far more than it ever looks at again. Appointment patterns, no-shows, the questions patients ask before booking. None of it is analysed because nobody there has the time or the tools. I suspect there is a simple product in just telling them what they already know.",
  whyMe: "I spent three years building software for clinics and watched this happen in every one of them.",
  lookingFor: 'Someone who has worked with healthcare data and understands what small clinics can realistically adopt.',
  tags: ['healthcare', 'saas'],
};

// The patterns the repair uses to FIND what was written. They must match the
// originals above and nothing else.
const FIND = {
  deepOpener: 'Following up properly now that I have had time to read everything on %',
  investorOpener: 'I have been following % since it crossed the readiness bar.%',
  rewriteSuffix: '%To be more specific about what I mean: the first version would be deliberately small%',
};

module.exports = {
  QUIET_AFTER, DEEP_EXCHANGE, DEEP_VARIANTS,
  INVESTOR_OPENER, FOUNDER_REPLY, PITCH_NOTE, INVESTOR_AFTER, INVESTOR_VARIANTS,
  EXTRA_RESONANCES, RESONANCE_VARIANTS,
  REWRITE_SUFFIX, REWRITE_VARIANTS,
  QUIET_SPARK, FIND,
};
