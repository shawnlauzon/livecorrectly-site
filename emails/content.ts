/**
 * Email content maps — ported from fractalhumandesign WelcomeCampaignText.tsx.
 *
 * These are the injected-variable maps that welcome2/3 HTML templates reference
 * as {{ strategyWriteup }}, {{ authorityWriteup }}, {{ authorityTip }}.
 *
 * Map keys are lowercase to match innerAuthorityTypes output after lowercasing.
 * Strategy map keys match the full strategy string.
 */

export const strategyWriteups = new Map<string, string>([
  [
    'wait to respond before engaging',
    `Every day you encounter thousands of stimuli, whether it's seeing an article on the web, a conversation with friends, a project at work, or even someone's smile. Your correct way to interact with the world is to wait for such a stimulus, and then notice the response in your body. The response is spontaneous and involuntary; it is literally your body telling your mind something. By tuning into this feeling, you will begin to understand what your body says yes to, vs. what you merely feel you should do. By doing what you "respond" to, you will feel alive, energized, and satisfied.`,
  ],
  [
    'inform before taking action',
    `If you're like most Initiators, then you tend to start things without telling anyone about what you're about to do. This can cause quite a lot of disruption when the people around you suddenly learn that you've started something new, and of course causes all sorts of trust issues. Informing means that before you start something, you tell the people who will be impacted, because this way they won't feel blindsided, and many of them will actively help you make happen what you want to make happen. At worst, not informing can show up as manipulating people to get them to do what you want, and this is why informing is so important.`,
  ],
  [
    'wait for recognition and invitation',
    `It can be frustrating to wait for invitation. Especially since the world loves the energy of Builders, it can feel like you'll never be recognized, and that you'll be waiting forever. But the truth is, an Advisor who is not invited is never truly heard; their advice, no matter how spot on, falls on deaf ears. The key is to focus on becoming the expert in a system that you love, share what you know, and then wait. When you are invited by someone who has recognized your value, your work will have impact and you will feel energized.`,
  ],
  [
    'wait a 28 day cycle to reflect and assess',
    `Yes you read that right, 28 days! During this waiting period, every day you will perceive possibilities from different angles, and so it's important to really slow down and recognize how your perspective is continually shifting.`,
  ],
]);

export const authorityWriteups = new Map<string, string>([
  [
    'sacral',
    `Many suggest to follow your gut, and for you this is great advice. How this works for you is only something you can know by experimenting. In my Living Your Design workshop, we practice this by asking Yes-No questions and feeling how the body responds. There is often a guttural "uh-huh" for yes or "uh-uh" for no, but for many people this sound has been suppressed. For others there can be an energy which is rising or falling. Finding someone you trust and with whom you can be 100% truthful can help you understand your personal response mechanism. Regardless of how your gut responds, you can take action immediately if you get a positive response. This means that you have the energy to take action.`,
  ],
  [
    'emotional',
    `For you, there is no truth in the present moment. That means that even though you might be excited or resistant about something, you can't trust it. This is because you have an emotional wave: some days you're up and some days you're down. On up days everything is a "yes", and on down days everything's a "no". You've probably already noticed this in you. What you might not have done is to wait for the emotions to settle down before making a decision.`,
  ],
  [
    'splenic',
    `Your way of making decisions is almost magical: an instinctive or intuitive knowing of what is the most healthy for you. This knowing can be quite subtle, and because of this it can be easy for your mind to overrule it and make a "rational" decision. Beware of this! The ER is full of people like you who ignored this intuitive sense. How it works is quite unique for you, and so you'll need to cultivate and learn about this sense by being very calm and paying attention.`,
  ],
  [
    'ego',
    `This may sound completely heretical, but your way of making decisions is to BE SELFISH! What do YOU specifically want, what is in it for you? Ask yourself if your heart is in it: if yes, then it's likely something good for you to do. And make sure you have a balance between your drive and getting plenty of rest; like all Advisors, it can be difficult to know when enough is enough.`,
  ],
  [
    'self-projected',
    `Do you remember the show House, M.D.? In order to decide on the best course of action, he would need to talk to someone else in order to make a decision. And he wasn't asking for advice; he simply needed someone to act as a sounding board. This is you. In order to make decisions, you should talk to someone who you can trust in order to listen to what YOU say. When you are speaking in a way that feels authentic to you and makes you happy, this is a sign that you're on the right path.`,
  ],
  [
    'none',
    `Do you remember the show House, M.D.? In order to decide the best course of action, he would need to talk to someone else in order to make a decision. And he wasn't asking for advice; he simply needed someone to act as a sounding board. This is you. In order to make decisions, you should talk to multiple people who you can trust, and then listen to what they say. Also pay attention to how you feel in that environment while you are speaking. Notice if there are some consistencies in how you feel when talking to different people, and find what makes you happy.`,
  ],
]);

export const authorityTips = new Map<string, string>([
  [
    'sacral',
    `How this works for you is only something to know by experimenting. In my Living Your Design workshop, we practice this by asking Yes-No questions and feeling how the body responds. There is often a guttural "uh-huh" for yes or "uh-uh" for no, but for many people this sound has been suppressed. For others there can be an energy which is rising or falling. Finding someone you trust and with whom you can be 100% truthful can help you understand your personal response mechanism. Regardless of how your gut responds, you can take action immediately if you get a positive response. This means that you have the energy to take action.`,
  ],
  [
    'emotional',
    `How long will this take? At least overnight, but depending on how big of a decision, it might be days, weeks, months, or even years! When you don't have a big charge about the decision, when you have reached a level of equanimity, this will be a sign that you've reached clarity. But you will never be absolutely certain: 60% might be the best you ever get. The good news is that by waiting through your emotional wave, you will be able to understand the decision far better than non-emotional people will ever do.`,
  ],
  [
    'splenic',
    `Your instinct / intuition is attuned for keeping you out of danger, and so you might not even notice it unless there is something that you should avoid. And in those cases, it's EXTREMELY important to trust it. In general, it speaks only once and then be quiet. Subtle. Following through on your intuition can be especially challenging for Advisors who have been waiting for something to happen, and when it finally does, you get a NO. This is sometimes a test: the opportunity which is right for you appears only after saying no to one that isn't.`,
  ],
  [
    'ego',
    `You stay healthy by making and keeping promises, which is pretty rare. So have compassion for the majority of people who lack your willpower and should never make promises.`,
  ],
  [
    'self-projected',
    `Make sure to talk with many different people to get a full sense of your own direction. In addition to talking it out with others, ask yourself 1) does this feel like me? 2) will it make me happy? 3) Will it help me express myself? 4) Will it bring me in the right direction?`,
  ],
  [
    'none',
    `In addition to talking it out with others, ask yourself 1) does this feel like me? 2) will it make me happy? 3) Will it help me express myself? 4) Will it bring me in the right direction?`,
  ],
]);

/**
 * Structured shadow content for the welcome0 email.
 *
 * Each field is placed in a different part of the template:
 * - scenes: recognition bullet list at the top (rendered via Prose)
 * - story: personal paragraph explaining why the pattern is recognizable
 * - relief: inline clause — "But {relief}. It's easier than you think."
 * - closingLine: standalone line after the reply prompt
 * - ps: italic P.S. note — personal bookend related to the scenes
 */
export interface ShadowOpening {
  /** 3 recognition scenes as `- ` prefixed lines (rendered with Prose) */
  scenes: string;
  /** Personal story paragraph — why this pattern is recognizable */
  story: string;
  /** Relief clause — used inline: "But {relief}. It's easier than you think." */
  relief: string;
  /** Standalone closing line after the reply prompt */
  closingLine: string;
  /** P.S. note — personal bookend related to the scenes */
  ps?: string;
}

/**
 * Shadow content for welcome0 email, keyed by shadow name.
 *
 * Each shadow maps to a ShadowOpening with 5 content slots that the
 * template places independently throughout the email.
 *
 * "Bringing Traits/Strengths" is NOT in this map — it uses dynamic bridge
 * descriptions generated from the subscriber's chart.
 */
export const shadowOpenings = new Map<string, ShadowOpening>([
  [
    'Willpower',
    {
      scenes: `\
- You've got a stack of certifications and you always want more
- You make promises to show you care, and then you end up bailing
- You rank everyone you know, and you're not at the top`,
      story: `I have the same shadow as you. Maybe yours shows up differently, but I bet they're close. It took me a long time to realize I had a self-worth issue, until I could recognize the signs. And then I could stop beating myself up, because I knew it wasn't a personal failure. It's just mechanics.`,
      relief: `you'll know you can stop doing things to prove yourself, and even help others to love and believe in themselves`,
      closingLine: `You have nothing to prove.`,
      ps: `P.S. About my own stack of certifications: I didn't learn it to teach it. I learned it because I needed it. Turns out helping other people with it is what I'm designed for.`,
    },
  ],
  [
    'Emotional Intelligence',
    {
      scenes: `\
- You avoid going to parties because you're tired of acting how others expect
- Friends complain that you take things too personally
- You don't share what you really think because you don't want people to be upset`,
      story: `I have the same shadow as you. Maybe yours shows up differently, but I bet they're close. It took me a long time to realize my lack of emotional intelligence was a problem, until I could recognize the signs. And then I could stop beating myself up, because I knew it wasn't a personal failure. It's just mechanics.`,
      relief: `you'll know how to feel emotions without them controlling you, and even how to help others speak truth when necessary`,
      closingLine: `You are designed for emotional serenity.`,
      ps: `P.S. About my own emotional intelligence journey: I didn't start practicing Authentic Relating to teach it. I learned it because I needed it. Turns out helping other people with it is what I'm designed for.`,
    },
  ],
  [
    'Identity & Direction',
    {
      scenes: `\
- You often do what others want you to do or to be in business and life
- You try to make a particular place work even though you're always uncomforable there
- You judge yourself for being a completely different person in different places`,
      story: `Unlike some of the other challenges that the chart shows, this isn't one of my biggies. But I used to make it worse for people, telling them what they should do and getting frustrated when they didn't listen. Now I know this isn't a personality flaw. It's just mechanics.`,
      relief: `you'll begin to love your sensitive environmental nature and find you can help others to find connection and love`,
      closingLine: `You know exactly where you're meant to be.`,
    },
  ],
  // Remaining shadows — text to be provided by Shawn:
  // 'Survival Instinct'
  // 'Conceptualization'
  // 'Inspiration'
  // 'Drive & Stamina'
  // 'Energy Resource'
  // 'Communication & Action'
]);

/**
 * Hanging gate descriptions for the welcome0 email.
 *
 * Indexed by the gate the person HAS (not the missing gate).
 * Gates with multiple harmonics (10, 20, 34, 57) use arrays of 3.
 *
 * Each description conveys the felt experience of having a gift
 * but missing the harmonic partner needed to complete the channel.
 * Grounded in The Definitive Book of Human Design gate descriptions.
 *
 * Gates not yet covered will fall back to bridgeDescriptions in
 * lib/hd-chart/bridge-descriptions.ts.
 */
export const hangingGateDescriptions: Record<number, string | Record<number, string>> = {
  1: "You have a deep creative nature and a drive to express yourself in unique ways. But without someone to champion and promote what you create, your work may never reach the audience it deserves — and self-promotion feels deeply unappealing to you.",

  2: "You carry an innate sense of direction — a deep knowing of where you need to go. But without the resources and sustained power to fuel that direction, you can feel stuck with a vision you can't bring to life on your own.",

  3: "You have a gift for bringing order out of confusion and birthing something new. But without the patience and acceptance that the creative process has its own timing, your enthusiasm for change can destabilize those around you rather than empower them.",

  8: "You know how to spot and promote what's novel and inspiring in others. But without your own deep creative source to draw from, you may find yourself always championing other people's vision instead of expressing your own.",

  10: {
    20: "You carry a deep trait of self-acceptance — a code of behavior that lets you interact authentically with the world. But without a voice to speak for itself, that authenticity may go unrecognized. The people around you can't see what's clear and grounded about you, and without that recognition, you miss the invitations that would let your example truly land.",
    34: "You carry a deep trait of self-acceptance — an underlying code of authentic behavior. But without the regenerating energy to stand behind your convictions, you may know exactly who you are yet lack the sustained power to live it fully, especially when the world pushes back.",
    57: "You carry a deep trait of self-acceptance — a capacity for authentic behavior. But without intuitive awareness guiding you moment to moment, you may struggle to spontaneously adapt to what each situation truly requires for your well-being.",
  },

  12: "You have a unique and powerful voice — the quality and tone of how you speak can deeply move others. But without emotional clarity about what you're actually feeling, you may hold back, unsure of what to say or when to say it.",

  14: "You have access to powerful resources and the energy to sustain creative work over long periods. But without a clear sense of direction for where to invest that energy, your great power may feel unfocused — fuel without a destination.",

  20: {
    10: "You are wired to live fully in the present moment — what you say and do bursts out of you before you can think about it. But without a clear code of authentic behavior to anchor your expression, your spontaneous words and actions may lack the grounded quality that would make others recognize something truly clear about you.",
    34: "You are wired to live fully in the present moment, ready to express and manifest. But without sustained regenerating energy to fuel your deeds, your awareness may struggle to become action — the moment passes before the doing can match the insight.",
    57: "You are wired to live fully in the present moment, ready to speak your truth. But without intuitive clarity penetrating to the core of what's really going on, your spontaneous words may lack the depth of instinctive wisdom that would make them truly transformative.",
  },

  22: "You have a gift for emotional openness and social grace — you know how to listen and connect with others deeply. But without the articulate voice to express what you feel, your depth of emotional awareness may stay trapped inside, waiting for the right words.",

  23: "You have the voice to translate insight into language that others can understand. But without the inner knowing and breakthrough to fuel what you say, you may worry that your words lack the depth or clarity to truly land.",

  24: "Your mind has a gift for reviewing and rationalizing ideas until a new understanding emerges. But without a connection to deep inner truth and inspiration, you may find yourself chasing mental puzzles that don't truly matter.",

  25: "You carry a universal, innocent love for life and everything in it. But without the competitive fire and initiative to act on that love, your spirit may feel untested — a deep well of devotion without the challenges that would deepen it into wisdom.",

  28: "You have a deep awareness of what makes life worth living, and you're willing to take risks to find it. But without the fighting spirit to stand behind what matters, you may exhaust yourself in struggles that aren't truly yours.",

  34: {
    10: "You have a potent, impressive source of regenerating energy — pure power that others admire and envy. But without a code of authentic behavior to focus it, your relentless energy may lack conviction, leaving you powerful but unsure what to stand for.",
    57: "You have a potent, impressive source of regenerating energy — pure power that's unavailable to anyone but you. But without intuitive guidance, this relentless force may become unhealthy and misdirected — you may feel lost in your own momentum, expending energy that serves no one.",
    20: "You have a potent, impressive source of regenerating energy — pure power that others admire and envy. But without a voice to manifest your awareness into deeds, your great energy may churn without clear expression, busy but unable to articulate what it's doing or why.",
  },

  38: "You have a fierce independence and the energy to stand up against anything that would compromise your integrity. But without the awareness of which struggles actually have meaning, you may fight battles that leave you exhausted rather than fulfilled.",

  39: "You have the energy to provoke and tease out what's real in people — to reveal their true spirit. But without the emotional depth to channel that provocation, the pressure may turn inward, leaving you restless and searching for release.",

  43: "Your mind has a unique capacity for breakthrough insights — you simply know things that others don't. But without the voice to explain your knowing, you may feel like a genius trapped behind glass, unable to share what you see.",

  51: "You have the courage and competitive fire to shock others out of complacency and into growth. But without the grounding innocence and universal love to give that shock meaning, your initiative may feel reckless — bold action without spiritual depth.",

  55: "You carry deep emotional awareness and a rich inner spirit that shifts with your moods. But without someone to provoke that spirit out of you, you may stay locked inside your own emotional world, unable to share its depth with others.",

  57: {
    34: "You have extraordinary intuitive clarity — a penetrating awareness of what's safe, healthy, and true in each moment. But without the regenerating energy to act on your instincts, your instinctive intelligence may go unused.",
    10: "You have extraordinary intuitive clarity — an innate knowing of what's safe and healthy. But without authentic behaviors to follow through on what your intuition tells you, you may sense what's needed yet not embody it in how you interact with others.",
    20: "You have extraordinary intuitive clarity — a penetrating awareness in the now. But without a voice to speak your truth in the moment, your deepest knowing — that little voice that speaks once and softly — may pass unheard, even by you.",
  },

  60: "You feel the deep pressure of evolutionary potential building inside you — something new wants to emerge. But without the ability to bring order to that chaos, you may feel stuck, unable to move forward despite the restless energy within.",

  61: "You feel the pressure to know the unknowable — to unravel life's deepest mysteries. But without the ability to process your inspiration into something communicable, you may feel haunted by insights you can't quite articulate.",
};

/**
 * Look up a content map by inner authority type.
 * Normalizes the key to lowercase to handle casing differences.
 * Falls back to 'none' for Ego-Projected authority (same copy as Self-Projected for writeups,
 * same as None for tips — matching the old system's behavior).
 */
export function lookupByAuthority(
  map: Map<string, string>,
  innerAuthority: string,
): string {
  const key = innerAuthority.toLowerCase();
  const result = map.get(key);
  if (result) return result;

  // Ego-Projected falls back to 'ego' for writeups, 'none' for tips
  if (key === 'ego-projected') {
    return map.get('ego') ?? map.get('none') ?? '';
  }

  return '';
}
