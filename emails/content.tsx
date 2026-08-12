/**
 * Email content maps — ported from fractalhumandesign WelcomeCampaignText.tsx.
 *
 * These are the injected-variable maps that welcome2/3 HTML templates reference
 * as {{ strategyWriteup }}, {{ authorityWriteup }}, {{ authorityTip }}.
 *
 * Map keys are lowercase to match innerAuthorityTypes output after lowercasing.
 * Strategy map keys match the full strategy string.
 */

import * as React from 'react';
import { Text } from 'react-email';
import { innerAuthorityTypes } from '../lib/hd-chart/constants';

/** Standard paragraph styling used across all email content. */
const P_CLASS = 'mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]';

/** Paragraph wrapper — each <P> renders as its own <p> in the email. */
export function P({ children }: { children: React.ReactNode }) {
  return <Text className={P_CLASS}>{children}</Text>;
}

/** Type-safe authority names derived from constants */
export type InnerAuthority = (typeof innerAuthorityTypes)[number];

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
  shadow: string;
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
      shadow: 'over compensate',
      scenes: `\
- Having a stack of certifications and always wanting more
- Making promises to show you care, and then you end up bailing
- Ranking everyone you know, and you're not at the top`,
      story: `And I have the same shadow as you. Those tendencies up top? I've felt every single one of them. Maybe yours show up a little differently, but I bet they're close.`,
      relief: `you'll stop doing things to prove yourself, and can even be wise about what is truly valuable`,
      closingLine: `You have nothing to prove.`,
      ps: `About my own stack of certifications: I didn't learn it to teach it. I learned it because I needed it. Turns out helping other people with it is what I'm designed for.`,
    },
  ],
  [
    'Emotional Intelligence',
    {
      shadow: 'be touchy, nervous, and defensive',
      scenes: `\
- Avoiding going to parties because you're tired of acting how others expect
- Friends complaining that you take things too personally
- Not sharing what you really think because you don't want people to be upset`,
      story: `And I have the same shadow as you. Those tendencies up top? I've felt every single one of them. Maybe yours show up a little differently, but I bet they're close.`,
      relief: `you'll feel emotions without them controlling you, and can even be wise about knowing the right time to speak out`,
      closingLine: `You are designed for emotional serenity.`,
      ps: `About my own emotional intelligence journey: I didn't start practicing Authentic Relating to teach it. I learned it because I needed it. Turns out helping other people with it is what I'm designed for.`,
    },
  ],
  [
    'Identity & Direction',
    {
      shadow: 'be role confused',
      scenes: `\
- Doing what others want you to do in business and life
- Trying to make a particular place work even though you're uncomfortable
- Judging yourself for being a completely different person in different places`,
      story: `And even though my integrated design doesn't have these shadows, my mind believes I do. I would look for my identity from other people rather than believe in myself.`,
      relief: `you'll trust yourself to find the correct place for you, and can even be wise about how to find connection and love`,
      closingLine: `You know exactly where you're meant to be.`,
    },
  ],
  [
    'Survival Instinct',
    {
      shadow: 'be unable to let go',
      scenes: `\
- Not moving to a lovely new town because you're afraid of losing what you already have
- Remaining at your current job even though you know that it's not right for you
- Not leaving a relationship that felt great at the beginning but you know it's not good for you`,
      story: `And even though my integrated design doesn't have these shadows, my mind believes I do. I stayed in a relationship and even got married because I was afraid of being alone, which is classic behavior.`,
      relief: `you'll stop depending on spontaneous reactions which don't work out, and can even be wise about instinctual and intuitive awareness of what is healthy or not`,
      closingLine: `You know what is good for you.`,
    },
  ],
  [
    'Conceptualization',
    {
      shadow: 'be mentally defensive',
      scenes: `\
- Trying to convince others that you are certain of your opinion
- Being afraid of not knowing something or being intellectually inconsistent and looking stupid
- Being rigid in your beliefs and feel compelled to argue when challenged`,
      story: `And I have the same shadow as you. I remember in school I hated to raise my hand, in case I was wrong. Maybe how it shows up for you is a little different, but I bet it's similar.`,
      relief: `you'll be completely okay not being certain about things, and even be wise about new ways of processing information`,
      closingLine: `You are beautifully open-minded.`,
    },
  ],
  [
    'Inspiration',
    {
      shadow: 'lose focus',
      scenes: `\
- Thinking about things which are completely unimportant to you in this moment
- Getting distracted by other things (shiny object syndrome)
- Searching for something out there that inspires you`,
      story: `And I have the same shadow as you. Those tendencies up top? I've felt every single one of them. Maybe yours show up a little differently, but I bet they're close.`,
      relief: `you enjoy the wonder and mystery of the world, and can even be wise about which inspiration is worthy of contemplation`,
      closingLine: `Make lists. It helps :)`,
    },
  ],
  [
    'Drive & Stamina',
    {
      shadow: 'be in too much of a hurry',
      scenes: `\
- Trying to get things done as fast as possible to get rid of the pressure
- Believing that you're behind everyone else and need to catch up
- Allowing others to pressure you into getting everything done and off your plate`,
      story: `And even though my integrated design doesn't have these shadows, my mind believes I do. I still often feel pressure to finish things before going onto the next.`,
      relief: `you'll be able to distinguish between healthy and unhealthy pressure, and even be wise about when to allow the pressure to help`,
      closingLine: `Stop and smell the roses. You have time.`,
    },
  ],
  [
    'Energy Resource',
    {
      shadow: 'be over-zealous',
      scenes: `\
- Not noticing when you're tired and so you keep going until you're exhausted
- Thinking that you're the only one that can do things and so never delegating
- Pushing yourself to hustle even more than others because that's what you're supposed to do`,
      story: `And even though I don't usually have doesn't have these shadows, I have seen it in my workaholic father who does. And the result after years of this, is a body which is older than its years.`,
      relief: `you'll know when enough is enough, when to do it yourself, and even be wise about when to delegate`,
      closingLine: `Take breaks, even before you're tired.`,
    },
  ],
  [
    'Communication & Action',
    {
      shadow: 'try to be the star',
      scenes: `\
- Trying to force your voice into a conversation so that people see you
- Talking because the silence makes you uncomfortable
- Pushing yourself to be seen on social media when you really don't want to`,
      story: `And I have the same shadow as you. I would talk just to be seen, and usually people talked right over me. And I would blame myself for not being powerful enough.`,
      relief: `you'll wait for the perfect time to speak, and even be wise about what is worthy of attention`,
      closingLine: `When you are silent, it's your presence that speaks.`,
    },
  ],
]);

/**
 * Hanging gate descriptions for the welcome0 email.
 *
 * Indexed by the gate the person HAS (not the missing gate).
 * Gates with multiple harmonics (10, 20, 34, 57) use Record<number, string>
 * keyed by the missing gate.
 *
 * Each description conveys the felt experience of having a gift
 * but missing the harmonic partner needed to complete the channel.
 * Uses BG5 trait names from the reference document.
 */
export const hangingGateDescriptions: Record<
  number,
  string | Record<number, string>
> = {
  1: 'You have a deep creative nature and a drive to express yourself in unique ways. But without someone to champion and promote what you create, your work may never reach the audience it deserves — and self-promotion feels deeply unappealing to you.',

  2: "You carry an innate sense of direction — a deep knowing of where you need to go. But without the power skills and resources to fuel that direction, you can feel stuck with a vision you can't bring to life on your own.",

  3: 'You have a gift for bringing order out of confusion and birthing something new. But without the acceptance that the creative process has its own timing and limits, your enthusiasm for change can destabilize those around you rather than empower them.',

  4: 'You have a mind that formulates answers and solutions — given the right question, you can find the pattern. But without the doubt that identifies which questions actually matter, you may spend your life answering questions no one asked, or feel anxious that your solutions have no clear purpose.',

  5: "You thrive on rhythm and routine — fixed patterns that keep you vital, healthy, and in your flow. But without the diversity to embrace life's natural extremes, you can become rigid, and any disruption to your patterns may feel destabilizing.",

  6: "You generate emotional friction that is essential for growth — a heat that tests whether intimacy is safe to open to. But without the ability to achieve union by breaking down barriers, you may stay guarded, your boundaries keeping others at arm's length even when you want to let them in.",

  7: "You have a natural sense of society's future direction and the leadership vision to guide others there. But without the influence to transfer that vision to the people who can carry it forward, you may find yourself leading from behind the scenes, unseen by those you could most impact.",

  8: "You know how to spot and promote what's novel and inspiring in others. But without your own deep creative self-expression to draw from, you may find yourself always championing other people's vision instead of expressing your own.",

  9: 'You have the capacity to focus your energy with extraordinary diligence for detail. But without the stillness to anchor you in one place, you may find yourself unable to sit still long enough to concentrate — your focus scatters before the work is done.',

  10: {
    20: "You carry a deep self-acceptance — a code of authentic behavior that lets you interact genuinely with the world. But without contemplation to give it voice, that authenticity may go unrecognized. The people around you can't see what's clear and grounded about you, and without that recognition, you miss the invitations that would let your example truly land.",
    34: 'You carry a deep self-acceptance — an underlying code of authentic behavior. But without the personal power to stand behind your convictions, you may know exactly who you are yet lack the sustained energy to live it fully, especially when the world pushes back.',
    57: 'You carry a deep self-acceptance — a capacity for authentic behavior. But without intuitive insight guiding you moment to moment, you may struggle to spontaneously adapt to what each situation truly requires for your well-being.',
  },

  11: 'Your mind is a wellspring of ideas — stimulating concepts designed to be reflected upon and shared. But without the stimulation that turns ideas into compelling stories, you may feel pressured to express them impulsively, before the right audience or timing has arrived.',

  12: "You have a unique and powerful voice — the quality and tone of how you speak can deeply move others. But without emotional openness to clarify what you're actually feeling, you may hold back, unsure when the mood is right to share what's inside you.",

  13: "You are a natural confidante — people share their stories and secrets with you because you genuinely listen. But without the retreat to process and select what's worth sharing, your treasure trove of human experience may stay locked inside you, waiting for an audience that never arrives.",

  14: 'You have access to powerful resources and the energy to sustain creative work over long periods. But without the driver to set a clear direction for where to invest that energy, your great power may feel unfocused — fuel without a destination.',

  15: 'You embrace the full spectrum of human behavior with an extraordinary love of diversity. But without fixed patterns to anchor your ever-shifting rhythms, your constantly changing tempo may cost you the focus needed to achieve mastery in your own life.',

  16: 'You have enthusiasm and a natural talent for skills that, with practice, become mastery. But without the depth to back up your performance, you may become self-critical — searching for the foundation beneath your talent that would make it truly sing.',

  17: "You see the world in patterns and opinions — a concept forms in your mind with visual clarity. But without the details to support and communicate what you see, your insights may stay trapped as images you can't quite put into words.",

  18: "You have a keen eye for what needs correcting — a deep concern for health and integrity. But without the vitality and joyful energy to fuel that correction constructively, your gift for seeing what's wrong can become a chronic dissatisfaction that drains rather than heals.",

  19: 'You are deeply sensitive to what people need — food, shelter, spirit, belonging. But without the principles and authority to manage those resources, you may feel the weight of unfulfilled needs all around you with no power to address them.',

  20: {
    10: 'You are wired to live fully in the present moment — what you say and do bursts out of you before you can think about it. But without a clear code of authentic behavior to anchor your expression, your spontaneous words and actions may lack the grounded quality that would make others recognize something truly clear about you.',
    34: 'You are wired to live fully in the present moment, ready to express and manifest. But without the personal power to fuel your deeds, your awareness may struggle to become action — the moment passes before the doing can match the insight.',
    57: "You are wired to live fully in the present moment, ready to speak your truth. But without intuitive insight penetrating to the core of what's really going on, your spontaneous words may lack the depth of instinctive wisdom that would make them truly transformative.",
  },

  21: "You need to be in control of your own domain — you don't tolerate being told what to do. But without the ability to gather people together under your authority, you may find yourself endlessly searching for a kingdom worthy of your management.",

  22: 'You have a gift for emotional openness and social grace — you know how to listen and connect with others deeply. But without the cautious, articulate voice to express what you feel, your depth of emotional awareness may stay trapped inside, waiting for the right words.',

  23: 'You have the voice to translate insight into language that others can understand. But without the breakthrough insights to fuel what you say, you may worry that your words lack the depth or originality to truly land.',

  24: "Your mind has a gift for reviewing and rationalizing ideas until a new understanding emerges. But without a connection to inner truth and inspiration, you may find yourself chasing mental puzzles that don't truly matter.",

  25: 'You carry a universal, innocent love for life and everything in it. But without the initiative and competitive fire to act on that love, your spirit may feel untested — a deep well of devotion without the challenges that would deepen it into wisdom.',

  26: 'You are a natural salesperson with the ego and resilience to withstand rejection. But without the instinctive alertness to know what the market actually needs, you may find yourself selling brilliantly — but selling the wrong thing at the wrong time.',

  27: 'You have a deep drive to care for and nourish others — a powerful, altruistic impulse. But without the values to set boundaries around your caring, you can exhaust yourself nurturing everyone who needs you, sacrificing your own well-being in the process.',

  28: "You have a deep awareness of what makes life worth living, and you're willing to take risks to find it. But without the fighter's clarity about which struggles actually have purpose, you may pour your energy into battles that leave you exhausted rather than fulfilled.",

  29: "You have an extraordinary readiness to say yes and commit your energy with perseverance. But without the determination of the body to guide where that energy goes, you may find yourself working tirelessly toward something without knowing whether it's truly right for you.",

  30: "You feel things deeply — your emotional wave carries you through hope and pain, teaching you to accept what life brings. But without the dreamer's fantasies to give your feelings direction, your deep capacity for experience may feel untethered — powerful emotions searching for a desire to cling to.",

  31: "You have a powerful voice of influence — people listen when you speak. But without the leader's strategic vision to back up your words, your influence may lack substance, and you may struggle to show others the direction you want them to follow.",

  32: 'You have an instinctive awareness of what has lasting value — what can endure and what will fail. But without the drive and ambition to fuel transformation, your gift for recognizing potential may stay passive, evaluating from the sidelines without the energy to act.',

  33: "You carry hard-won wisdom from your experiences, and a deep need for privacy to process what you've witnessed. But without the listener to draw out your stories and hold them, you may retreat so far inward that your most valuable lessons are never shared.",

  34: {
    10: 'You have a potent, impressive source of regenerating energy — pure power that others admire and envy. But without a code of authentic behavior to focus it, your relentless energy may lack conviction, leaving you powerful but unsure what to stand for.',
    57: "You have a potent, impressive source of regenerating energy — pure power that's unavailable to anyone but you. But without intuitive insight to guide it, this relentless force may become misdirected — you may feel lost in your own momentum, expending energy that serves no one.",
    20: "You have a potent, impressive source of regenerating energy — pure power that others admire and envy. But without contemplation to manifest your awareness into deeds, your great energy may churn without clear expression, busy but unable to articulate what it's doing or why.",
  },

  35: 'You are driven by a restless curiosity to explore new horizons and collect experiences. But without the emotional depth that crisis brings, your hunger for progress may become a chase for novelty — always moving forward but never reaching the feeling of depth that would make your experiences truly transformative.',

  36: 'You carry deep emotional intensity — a capacity to grow through crisis that transforms vulnerability into wisdom. But without the progress and direction to channel that intensity outward, your emotional depth may turn inward, creating personal crises when there is no outlet for the powerful feelings building inside you.',

  37: "You have a gift for holding family and community together through warmth, friendship, and nurturing. But without someone willing to deliver the resources and provide for the group, you may find yourself making promises to your community that you can't fulfill on your own.",

  38: "You have a fierce independence and the energy to fight for what matters. But without the game player's awareness of which risks make life worth living, you may pour your fighting spirit into battles that have no real purpose, leaving you exhausted rather than fulfilled.",

  39: "You have the energy to provoke and tease out what's real in people. But without the spirit to respond to your provocation, the pressure may turn inward — provoking yourself into restless excess rather than drawing out the emotional depth of others.",

  40: 'You have the willpower and love of work to provide for others — a strong, independent provider. But without the friendship and family bonds to deliver your provisions to, you may work in isolation, generating resources that no community is there to receive.',

  41: 'You carry the pressure of desire — a hunger to experience something new, a fantasy of what life could be. But without fate to guide which desires are yours to fulfill, you may feel a restless wanting without knowing what it is you actually want.',

  42: 'You have the tenacity to stay with a process and see it through to completion. But without the beginnings to properly initiate what you commit to, you may struggle to get things started — or find yourself finishing cycles that were never yours to begin.',

  43: "Your mind has a unique capacity for breakthrough insights — you simply know things that others don't. But without assimilation to translate your knowing into language, you may feel like a genius trapped behind glass, unable to share what you see.",

  44: "You have an instinctive alertness for what's needed — a memory of patterns that can guide your community's material success. But without the sales and marketing ability to transmit what you know, you may over-promise and under-deliver, lacking the ego power to turn your instincts into influence.",

  45: "You have a natural authority to gather people together and protect your community's resources. But without the control to manage the day-to-day operations of your domain, you may find yourself presiding over a kingdom with no one to run it.",

  46: 'You experience life through your body — serendipity, determination, and the love of being in physical form. But without the perseverance to commit your energy fully, you may sense the right moment but lack the sustained fuel to see the cycle through.',

  47: "You have the gift of realization — the ability to assemble fragments of experience into meaningful insight. But without the abstractions flowing through your mind to work with, you may pressure yourself for clarity when there's simply nothing yet to resolve.",

  48: 'You carry a deep well of instinctual knowing — solutions rooted in an awareness that goes far beneath the surface. But without the skills to express and demonstrate your depth, you may experience feelings of inadequacy, fearing that no one will ever recognize what you have to offer.',

  49: "You hold powerful principles about who belongs and who doesn't — the authority to accept or reject on behalf of your community. But without sensitivity to social needs that reveals what people actually require, your principles may become rigid — rejecting those who simply haven't had their needs met.",

  50: "You are a guardian of values — an instinctive lawmaker who knows what's right for the community's well-being. But without the nourishment to put those values into caring action, you may know exactly what your people need but lack the energy to provide it.",

  51: 'You have the courage and competitive fire to shock others out of complacency and into growth. But without the innocence and universal love to give that shock meaning, your initiative may feel reckless — bold action without spiritual depth.',

  52: 'You have an extraordinary power to be still — a concentrated presence that can anchor those around you. But without the focus to direct that stillness toward something specific, you may oscillate between restless searching and passive withdrawal, unable to channel your concentration.',

  53: 'You carry the spark to begin new things — a restless pressure to initiate cycles of growth and development. But without the growth to sustain what you start, you may feel frustrated by a pattern of unfinished projects, not realizing that your gift is in the beginning, not the ending.',

  54: "You have an extraordinary drive and ambition — the fuel to rise up and transform your position in the world. But without the continuity to assess what has lasting value, your ambition may burn bright but directionless, chasing success that doesn't endure.",

  55: 'You carry deep emotional awareness and a rich inner spirit that shifts with your moods. But without someone to provoke that spirit out of you, you may stay locked inside your own emotional world, unable to share its depth with others.',

  56: 'You are a born storyteller — your voice turns experience into compelling tales that shift beliefs and stimulate new thinking. But without the ideas to fuel your stories, you may find yourself searching restlessly for something new to talk about, or retelling the same experiences without fresh inspiration.',

  57: {
    34: "You have extraordinary intuitive clarity — a penetrating awareness of what's safe, healthy, and true in each moment. But without the personal power to act on your instincts, your instinctive intelligence may go unused.",
    10: "You have extraordinary intuitive clarity — an innate knowing of what's safe and healthy. But without authentic behavior to follow through on what your intuition tells you, you may sense what's needed yet not embody it in how you interact with others.",
    20: 'You have extraordinary intuitive clarity — a penetrating awareness in the now. But without contemplation to speak your truth in the moment, your deepest knowing — that little voice that speaks once and softly — may pass unheard, even by you.',
  },

  58: "You bring a joyful vitality and audacity to challenge what isn't working — a love of life that wants everything to thrive. But without the correction to identify exactly what needs fixing, your energy may scatter — desperate to improve things but unsure where to focus.",

  59: 'You have the power to break through barriers to intimacy — to dissolve the walls that keep people apart. But without the friction to test whether the timing is right, you may open doors too quickly, creating bonds that lack the emotional depth to sustain them.',

  60: 'You feel the deep pressure of mutation building inside you — something new wants to emerge. But without the ordering to give that potential its proper structure, you may feel stuck, unable to move forward despite the restless energy within.',

  61: "You feel the pressure to know the unknowable — to unravel life's deepest mysteries. But without rationalization to process your inspiration into a concept you can communicate, you may feel haunted by insights that return again and again but never fully resolve.",

  62: 'You have an eye for detail — the facts and specifics that make complex things understandable. But without the opinions and patterns to give your details structure, you may accumulate facts that lack a coherent framework, blurting out information that confuses rather than clarifies.',

  63: 'You have a keen sense of doubt — an ability to spot inconsistencies and question what others take for granted. But without the formulization to resolve your doubts into workable answers, your suspicions may build into anxiety, endlessly questioning without resolution.',

  64: 'Your mind is a stream of images and memories — fragments of past experience cycling through, seeking meaning. But without the realization to assemble those fragments into clarity, you may feel overwhelmed by mental confusion, tempted to force resolution before the picture is complete.',
};

// ---------------------------------------------------------------------------
// Welcome 1 content maps — keyed by BG5 career type
// ---------------------------------------------------------------------------

/**
 * How the career type engages with the world.
 * Full paragraph describing their energy mechanics.
 * Each function receives the authority type to allow referencing decision-making mechanics.
 */
export const typeEngagement = new Map<
  string,
  (authority: InnerAuthority) => React.ReactNode
>([
  [
    'Classic Builder',
    (authority) => {
      const baseText =
        'The advice that is designed for you is to wait for your body to respond,';
      const energyText =
        "You've got tons of energy, but you can only tap into it when you're doing what you love.";

      switch (authority) {
        case 'Sacral':
          return (
            <P>
              {baseText} and then to follow your gut. {energyText} And your gut
              always knows what that is, in the present moment.
            </P>
          );

        case 'Emotional':
          return (
            <P>
              {baseText} and then to allow your emotions to guide you.{' '}
              {energyText}&nbsp;And it&apos;s your emotions which know what this
              is.
            </P>
          );

        default:
          return (
            <P>
              {baseText}. {energyText}
            </P>
          );
      }
    },
  ],
  [
    'Advisor',
    (authority) => {
      return (
        <P>
          The advice that is designed for you is to wait for a formal
          invitation. You&apos;ve got a limited supply of energy, but when you
          are working with the right person, it doesn&apos;t drain you. In fact
          it feels sweet!
        </P>
      );
    },
  ],

  // TODO: Shawn to provide per-type copy (functions receive authority: InnerAuthority)
  // ['Express Builder', (authority) => <>...</>],
  // ['Initiator', (authority) => <>...</>],
  // ['Advisor', (authority) => <>...</>],
  // ['Evaluator', (authority) => <>...</>],
]);

/**
 * What "waiting" (or "informing" for Initiator) actually means.
 * Full paragraph with practical specifics.
 */
export const waitingDetail = new Map<
  string,
  (authority: InnerAuthority) => React.ReactNode
>([
  [
    'Classic Builder',
    (authority) => {
      const baseText =
        'It means your job is to make sure enough opportunities arise to give your body something to respond to. It might be words spoken directly to you, or something you can see, hear, or even smell. ';

      switch (authority) {
        case 'Sacral':
          return (
            <P>
              {baseText}And when it comes time to make a decision, your gut will
              tell you what to do.
            </P>
          );

        case 'Emotional':
          return (
            <P>
              {baseText} And when it comes time to make a decision, play hard to
              get. If it&apos;s a request, tell them to ask you later. Take the
              time your system needs to really feel into it. If it&apos;s right
              for you, they&apos;ll be back.
            </P>
          );

        default:
          return <P>{baseText}</P>;
      }
    },
  ],
  [
    'Advisor',
    (authority) => {
      const baseParagraphs = (
        <>
          <P>
            It means that while you are waiting, your time is best spent
            becoming a master in whatever field you choose. Don&apos;t get
            disappointed if this takes months or even years&mdash;at the right
            time, your mastery will be recognized and an invitation offered.
          </P>
          <P>
            You only need to wait for a formal invitation to these major
            decisions: invitations to love, to a career, to bond with others,
            and to a place to live. Don&apos;t wait for a formal invitation to
            have dinner!
          </P>
        </>
      );

      switch (authority) {
        case 'Emotional':
          return (
            <>
              {baseParagraphs}
              <P>
                And that&apos;s the time when you play hard to get. I know, it
                sounds crazy. But tell them to come back and ask you later. Or
                say you need to sleep on it. Take the time your system needs to
                really feel into it. If it&apos;s right for you, they&apos;ll be
                back.
              </P>
            </>
          );
        case 'Splenic':
          return (
            <>
              {baseParagraphs}
              <P>
                And that&apos;s the time when you trust your intuition. If your
                intuition says this isn&apos;t right for you, then say no.
                Knowing when to accept and when to decline is what gives you the
                energy to say yes to the correct invitation.
              </P>
            </>
          );

        default:
          return baseParagraphs;
      }
    },
  ],

  // TODO: Shawn to provide per-type copy
  // ['Express Builder', '...'],
  // ['Initiator', '...'],
  // ['Evaluator', '...'],
]);

/**
 * Look up a content map by BG5 career type.
 * Falls back from Express Builder → Classic Builder when no specific entry exists.
 */
export function lookupByCareerType(
  map: Map<string, string>,
  careerDesign: string,
): string {
  const result = map.get(careerDesign);
  if (result) return result;
  if (careerDesign === 'Express Builder')
    return map.get('Classic Builder') ?? '';
  return '';
}

/**
 * Look up a function-based content map by BG5 career type and execute it.
 * Falls back from Express Builder → Classic Builder when no specific entry exists.
 * Passes authority to the function for dynamic content generation.
 */
export function lookupByDMS(
  map: Map<string, (authority: InnerAuthority) => React.ReactNode>,
  careerDesign: string,
  authority: InnerAuthority,
): React.ReactNode {
  const fn = map.get(careerDesign);
  if (fn) return fn(authority);
  if (careerDesign === 'Express Builder') {
    const fallbackFn = map.get('Classic Builder');
    if (fallbackFn) return fallbackFn(authority);
  }
  return '';
}

/**
 * Format a prompt clause into the correct voice for the career type.
 * - Generator: yes/no question ("Have you ever {clause}?")
 * - Manifestor: statement ("I would love to hear if you ever {clause}.")
 * - Projector / Reflector: open-ended question ("What's a time that you ever {clause}?")
 *
 * The clause should be the bare action, e.g.
 * "followed someone's advice which works for them, but didn't work for you"
 */
export function formatPrompt(
  clause: string,
  opts: { isGenerator: boolean; isManifestor: boolean },
): string {
  if (opts.isGenerator) {
    return `Have you ever ${clause}?`;
  }
  if (opts.isManifestor) {
    return `I'm curious if you ever ${clause}.`;
  }
  return `What's a time that you ever ${clause}?`;
}

/**
 * Format a frequency/quality prompt into the correct voice for the career type.
 * - Generator: yes/no question ("Do you often {clause}?")
 * - Manifestor: statement ("I would love to hear how often you {clause}.")
 * - Projector / Reflector: open-ended question ("How often do you {clause}?")
 *
 * The clause should be the bare action, e.g. "feel frustrated"
 */
export function formatOftenPrompt(
  clause: string,
  opts: { isGenerator: boolean; isManifestor: boolean },
): string {
  if (opts.isGenerator) {
    return `Do you often ${clause}?`;
  }
  if (opts.isManifestor) {
    return `I'm curious how often you ${clause}.`;
  }
  return `How often do you ${clause}?`;
}

export function formatLandForYou(opts: {
  isGenerator: boolean;
  isManifestor: boolean;
}): string {
  if (opts.isGenerator) {
    return `Does this land for you?`;
  }
  if (opts.isManifestor) {
    return `I'm curious how this lands for you.`;
  }
  return `How does this land for you?`;
}

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
