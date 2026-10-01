/**
 * The case for every feature, in one place.
 *
 * Each of these answers the only question that matters on a first visit: why
 * would anybody bother? Not what the feature is called, not how it works —
 * what it is worth, and what it asks of them.
 *
 * THE PROBLEM THIS SOLVES. Every surface in this product is named rather than
 * explained. Sparks. Launches. Circles. Standing. Explore. Somebody who has
 * just signed up lands on one, sees a word they have never encountered and an
 * empty page underneath, and leaves. The feature is not missing; the reason to
 * use it is.
 *
 * THE VOICE IS THE BRAND. Everything else in this space flatters people. This
 * product says a match is weak, says product-market fit is not measured, says
 * most ventures here have nothing to show yet. That honesty is what makes the
 * ambition believable, so none of these oversells: each says plainly what the
 * thing is worth and what it costs.
 *
 * Kept together rather than scattered across twenty files, because a voice
 * written in twenty places stops being one voice within a month.
 */

export const INTROS = {
  // ---------------------------------------------------------------- founder
  sparksFounder: {
    eyebrow: 'Sparks',
    headline: 'Say the idea out loud before you commit years to it.',
    body: 'A spark is a thought you have not decided on. You put it up, people who understand the problem argue with it, and you find out whether anybody else cares before you have given up a job for it. Two people agreeing on a spark is how most things here start.',
    points: [
      { value: 'No equity', label: 'Nothing is committed' },
      { value: 'Minutes', label: 'To write one' },
      { value: 'Reversible', label: 'Rewrite it any time' },
    ],
    action: { label: 'Write one', to: '/app/sparks' },
  },

  launchesFounder: {
    eyebrow: 'Launches',
    headline: 'Put it up before you think it is ready.',
    body: 'Show what you have built and ask people here to use it. Y Combinator makes every company do this internally before a public launch, long before founders feel comfortable, because the feedback is worth more than the polish. A rough thing with eight honest reactions beats a finished one nobody has opened.',
    points: [
      { value: 'Inside', label: 'Not public yet' },
      { value: 'Honest', label: 'People who know the field' },
      { value: 'Ask', label: 'The assistant reads it all' },
    ],
    action: { label: 'Put something up', to: '/app/launches/new' },
  },

  schemesFounder: {
    eyebrow: 'Government schemes',
    headline: 'Money that does not cost you any of your company.',
    body: 'India runs a large non-dilutive funding system and almost nobody building here knows it exists. The Seed Fund Scheme alone is a ₹945 crore corpus giving up to ₹20 lakh as an outright grant, and DPIIT recognition, which most of it requires, is free and issued in days.',
    points: [
      { value: '₹20L', label: 'Grant, not repayable' },
      { value: '₹50L', label: 'For commercialisation' },
      { value: 'Free', label: 'To apply' },
    ],
  },

  rolesFounder: {
    eyebrow: 'Roles',
    headline: 'Find out what this venture is actually missing.',
    body: 'Not a job board. CapForge reads your problem, your solution and who is already with you, works out the roles this needs, then finds the people who fit them — with the reasoning shown, so you can disagree with it.',
  },

  teamFounder: {
    eyebrow: 'Team',
    headline: 'Nobody has joined yet, and that is normal.',
    body: 'A team forms out of a conversation here rather than a click: both of you have to say yes. Until then this page stays empty, which is honest. The fastest route is a role that already has people matched to it.',
    action: { label: 'See who fits', to: '/app/gaps' },
  },

  // ------------------------------------------------------------ contributor
  launchesContributor: {
    eyebrow: 'Try things',
    headline: 'Open what people here have built, and say what actually happened.',
    body: 'Founders put up real products and ask for honest reactions. "I did not understand what this was for" is worth more to them than encouragement, and more than anything they will get from friends. Being the first person to open something is the most useful you can be here.',
    points: [
      { value: 'Real', label: 'Products, not decks' },
      { value: 'Direct', label: 'The founder is in the thread' },
      { value: 'Earned', label: 'Useful feedback shows on your profile' },
    ],
  },

  sparksContributor: {
    eyebrow: 'Sparks',
    headline: 'Find the people thinking about what you are thinking about.',
    body: 'Half-formed ideas, put up by people who have not committed to them yet. If one is the problem you have wanted to work on for years, say so. This is where most founding pairs here met, before either of them had a company.',
  },

  standingContributor: {
    eyebrow: 'How you are doing',
    headline: 'Why you are, or are not, being found.',
    body: 'Not a score. It works out which of seven situations you are actually in — your profile is thin, nobody is building in your field, you are matched and nobody has written — and tells you which one, with the real numbers behind it.',
  },

  opportunitiesContributor: {
    eyebrow: 'Opportunities',
    headline: 'Every venture in your fields, closest fit first.',
    body: 'Nothing is hidden from you. A venture with no role that suits you still appears and says so plainly, because you may want it anyway and a founder will talk to somebody who cares about the problem. The order carries the judgement; absence carries none.',
    action: { label: 'Set your fields', to: '/app/my-profile' },
  },

  // --------------------------------------------------------------- investor
  exploreInvestor: {
    eyebrow: 'Explore',
    headline: 'Look through everything, not only what matched you.',
    body: 'Deal flow ranks ventures against your thesis. This ranks nothing: it is every venture here, for when you want to look rather than be shown. Track anything worth following and its movement appears on your deal flow.',
  },

  dealFlowInvestor: {
    eyebrow: 'Deal flow',
    headline: 'Ranked against what you wrote, with nothing hidden.',
    body: 'Write what you back and what you pass on, and the second half matters as much as the first. Everything is ranked rather than filtered: a weak venture sinks and says why, because judging an early company is your job, and a platform that hides one until it decides you are ready has made that call for you.',
    action: { label: 'Write your thesis', to: '/app/my-profile' },
  },

  trackingInvestor: {
    eyebrow: 'Tracking',
    headline: 'Watch something early and find out when it moves.',
    body: 'Mark a venture and this records where it stood on the day you did. When it climbs you are told, and it appears at the top of your deal flow. A venture you passed over at 29 that now sits at 48 is the thing worth knowing, and nobody else is going to tell you.',
    action: { label: 'Find something to watch', to: '/app/investor/explore' },
  },

  // ------------------------------------------------------------------- both
  circles: {
    eyebrow: 'Circles',
    headline: 'The room for your field, with the people actually in it.',
    body: 'Not a forum. A circle exists once two people here work in the same field, so every room has somebody who understands the problem. Ask the thing you would be embarrassed to ask publicly.',
  },
};

export default INTROS;
