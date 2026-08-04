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
  ps: string;
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
      relief: `you'll know you can stop doing things to prove yourself, and you'll have an alternative to making promises you can't keep`,
      closingLine: `You have nothing to prove.`,
      ps: `P.S. About my own stack of certifications: I didn't learn it to teach it. I learned it because I needed it. Turns out helping other people with it is what I'm built for.`,
    },
  ],
  [
    'Emotional Intelligence',
    {
      scenes: `\
- You avoid listening to voice messages because you're afraid of what you'll hear
- Friends complain that you take things too personally
- You don't share what's really going on because you don't want people to be upset`,
      story: `I have the same shadow as you. Maybe yours shows up differently, but I bet they're close. It took me a long time to realize my lack of emotional intelligence was a problem, until I could recognize the signs. And then I could stop beating myself up, because I knew it wasn't a personal failure. It's just mechanics.`,
      relief: `you'll know how to feel emotions without them controlling you, and how to speak your truth when necessary`,
      closingLine: `You don't need anger management; you just need solitude.`,
      ps: `P.S. About my own emotional intelligence journey: I didn't start practicing Authentic Relating to teach it. I learned it because I needed it. Turns out helping other people with it is what I'm built for.`,
    },
  ],
  // Remaining shadows — text to be provided by Shawn:
  // 'Identity & Direction'
  // 'Survival Instinct'
  // 'Conceptualization'
  // 'Inspiration'
  // 'Drive & Stamina'
  // 'Energy Resource'
  // 'Communication & Action'
]);

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
