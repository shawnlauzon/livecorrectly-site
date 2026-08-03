// Human Design lookup tables and constants
// Adapted from fractalhumandesign

export const types = [
  'Generator',
  'Manifesting Generator',
  'Manifestor',
  'Projector',
  'Reflector',
];

export const careerDesigns = [
  'Classic Builder',
  'Express Builder',
  'Initiator',
  'Advisor',
  'Evaluator',
];

export const profileLineNames: Record<number, string> = {
  1: 'Authority',
  2: 'Natural',
  3: 'Pioneer',
  4: 'Influencer',
  5: 'Messenger',
  6: 'Leader',
};

export const careerDesignSubtitles = [
  "When you're doing work you love, you can do it forever.",
  'You move fast, juggle well, and get more done than anyone expects.',
  'You get things started that no one else would.',
  'You see what others miss — and guide them to it.',
  "You know what's working and what isn't before anyone else does.",
];

export const innerAuthorityTypes = [
  'Emotional',
  'Sacral',
  'Splenic',
  'Ego',
  'Self-Projected',
  'Ego-Projected',
  'None',
];

export const innerAuthorityDescriptions = [
  'wait for emotional clarity',
  'follow your gut',
  'follow your instincts',
  'follow your willful determination',
  'listen to what you say',
  'follow your willful determination',
  'listen to what you say',
];

export const signatureThemes = [
  'satisfaction',
  'satisfaction',
  'peace',
  'success',
  'surprise',
];

export const notSelfThemes = [
  'frustration',
  'frustration',
  'anger',
  'bitterness',
  'disappointment',
];

export const strategies = [
  'wait to respond before engaging',
  'wait to respond before engaging',
  'inform before taking action',
  'wait for recognition and invitation',
  'wait a 28 day cycle to reflect and assess',
];

export const definitions = [
  'none',
  'single',
  'split',
  'triple split',
  'quadruple split',
];

export const assimilationStyles = [
  'objective',
  'independent',
  'collaborative',
  'synthesizing',
  'subjective',
];

/** Group thematics — indexed by value in chart.group.theme[] */
export const groupThemes: Record<number, string> = {
  0: 'Flexibility',
  1: 'Empowerment',
  2: 'Sharing',
  3: 'Support',
};

// --- Email-specific constants (ported from fractalhumandesign/utils/parse-chart.ts) ---

// GIF button images per type — used in email video links
export const typeButtonGifs = [
  'https://fractalhumandesign.s3.us-east-1.amazonaws.com/site/images/generator-button.gif',
  'https://fractalhumandesign.s3.us-east-1.amazonaws.com/site/images/generator-button.gif',
  'https://fractalhumandesign.s3.us-east-1.amazonaws.com/site/images/manifestor-button.gif',
  'https://fractalhumandesign.s3.us-east-1.amazonaws.com/site/images/projector-button.gif',
  'https://fractalhumandesign.s3.us-east-1.amazonaws.com/site/images/reflector-button.gif',
];

// YouTube video links per type
export const typeVideos = [
  'https://youtu.be/9PVgkBzpPqs',
  'https://youtu.be/9PVgkBzpPqs',
  'https://youtu.be/qvnRU2tdNXM',
  'https://youtu.be/Od8wVEL5b5w',
  'https://youtu.be/bgdaZBB2wCo',
];

export const strategyVideos = [
  'https://youtu.be/_g3cx77EeLs',
  'https://youtu.be/_g3cx77EeLs',
  'https://youtu.be/YTTm9Ziyi-8',
  'https://youtu.be/vypbRJShWyM',
  'https://youtu.be/924KXvH3mv4',
];

// Per-authority video links
export const innerAuthorityVideos = [
  'https://youtu.be/e9g6q1pKJeo',
  'https://youtu.be/0sUPwjp025M',
  'https://youtu.be/7S552VXC1tk',
  'https://youtu.be/8Nu3WvcQ0jA',
  'https://youtu.be/cF6CxUTGmfU',
  'https://youtu.be/8Nu3WvcQ0jA',
  'https://youtu.be/OvSo9Aa2XCc',
];

// Per-type signature/not-self videos
export const signatureVideos = [
  'https://youtu.be/fHGRdJSyE34',
  'https://youtu.be/fHGRdJSyE34',
  'https://youtu.be/UfkIprGbdHw',
  'https://youtu.be/eHWeVZIMrTw',
  'https://youtu.be/ltxpSWRx5t4',
];

// Adjective forms of themes (used in welcome4)
export const signatureThemeAdjectives = [
  'satisfied',
  'satisfied',
  'peaceful',
  'successful',
  'surprised',
];

export const notSelfThemeAdjectives = [
  'frustrated',
  'frustrated',
  'angry',
  'bitter',
  'disappointed',
];

// Standalone video URLs used in specific emails
export const strategyVideoMG = 'https://youtu.be/OkRewoajREQ';
export const sleepAloneProjectors = 'https://youtu.be/A1PBKKAJslo';

// Centers mapping (array indices map to center names)
// The chart.centers array has 9 values, one per center
export const centerNames = [
  'Root',
  'Sacral',
  'Splenic',
  'Solar Plexus',
  'Ego',
  'G Center',
  'Throat',
  'Ajna',
  'Head',
] as const;

// Center status values:
// 0 = open (completely open, no gates at all)
// 1 = undefined (has hanging gate - gate present but no complete channel)
// 2 = defined (has at least one complete channel)
export type CenterStatus = 0 | 1 | 2;

export function isCenterDefined(status: CenterStatus): boolean {
  return status === 2;
}

export function isCenterUndefined(status: CenterStatus): boolean {
  return status === 1;
}

export function isCenterOpen(status: CenterStatus): boolean {
  return status === 0;
}

// --- Shadow/BG5 Functions ---

/**
 * Shadow names in priority order (1-10).
 * Index 0 = shadow #1 (Bringing Traits/Strengths - conditional)
 * Index 1 = shadow #2 (Willpower - Ego center)
 * etc.
 */
export const shadowNames = [
  'Bringing Traits/Strengths',
  'Willpower',
  'Emotional Intelligence',
  'Identity & Direction',
  'Survival Instinct',
  'Conceptualization',
  'Inspiration',
  'Drive & Stamina',
  'Energy Resource',
  'Communication & Action',
] as const;

/**
 * Map from shadow name to center index.
 * Special: 'Bringing Traits/Strengths' has no center (uses bridges field).
 */
export const shadowToCenterIndex: Record<string, number | null> = {
  'Bringing Traits/Strengths': null,
  'Willpower': 4, // Ego
  'Emotional Intelligence': 3, // Solar Plexus
  'Identity & Direction': 5, // G Center
  'Survival Instinct': 2, // Spleen
  'Conceptualization': 7, // Ajna
  'Inspiration': 8, // Head
  'Drive & Stamina': 0, // Root
  'Energy Resource': 1, // Sacral
  'Communication & Action': 6, // Throat
};

/**
 * Shadow themes - the learning focus for each shadow.
 */
export const shadowThemes: Record<string, string> = {
  'Bringing Traits/Strengths': 'Bridging and connecting',
  'Willpower': 'Will and willpower',
  'Emotional Intelligence': 'Emotional awareness and intelligence',
  'Identity & Direction': 'Identity and direction',
  'Survival Instinct': 'Survival and well-being',
  'Conceptualization': 'Mental conceptualization',
  'Inspiration': 'Inspiration and mental pressure',
  'Drive & Stamina': 'Stress and drive',
  'Energy Resource': 'Life force energy',
  'Communication & Action': 'Communication and manifestation',
};

/**
 * Shadow lessons - what to learn from each shadow.
 */
export const shadowLessons: Record<string, string> = {
  'Bringing Traits/Strengths':
    'To bridge differences and bring people together through your unique connections',
  'Willpower':
    'To recognize when you have the willpower to commit and when you need to rest',
  'Emotional Intelligence':
    'To navigate emotional waves with awareness and patience',
  'Identity & Direction':
    'To find your own sense of self and direction from within',
  'Survival Instinct':
    'To distinguish between real threats and conditioned fears',
  'Conceptualization':
    'To stay open to multiple perspectives without getting locked into certainty',
  'Inspiration':
    'To let inspiration come and go without forcing answers to questions that aren\'t yours',
  'Drive & Stamina':
    'To work at a sustainable pace without rushing to relieve stress',
  'Energy Resource':
    'To recognize your natural rhythms and know when enough is enough',
  'Communication & Action':
    'To express yourself authentically without trying to force attention',
};

/**
 * Shadow pressures - the main conditioning pressure experienced.
 */
export const shadowPressures: Record<string, string> = {
  'Bringing Traits/Strengths':
    'Pressure to connect disparate groups or bridge gaps between people',
  'Willpower':
    'Pressure to prove your worth through willpower and commitments',
  'Emotional Intelligence':
    'Pressure to avoid confrontation and emotional truth',
  'Identity & Direction':
    'Pressure to find love, identity, and direction through others',
  'Survival Instinct':
    'Pressure to hold onto what feels safe, even when it no longer serves',
  'Conceptualization':
    'Pressure to be certain and mentally focused in uncertainty',
  'Inspiration':
    'Pressure to answer questions and solve problems that aren\'t yours',
  'Drive & Stamina':
    'Pressure to rush and complete tasks to relieve stress',
  'Energy Resource':
    'Pressure to keep working without knowing when to stop',
  'Communication & Action':
    'Pressure to be heard and to attract attention',
};

/**
 * Shadow descriptions - brief descriptions of the conditioning pattern.
 * Ported from fractalhumandesign WelcomeCampaignText.tsx
 */
export const shadowDescriptions: Record<string, string> = {
  'Bringing Traits/Strengths':
    'Connecting groups and bridging differences through unique talents',
  'Willpower':
    'Trying to prove yourself through willpower and commitments',
  'Emotional Intelligence':
    'Avoiding truth and consequences of emotional situations',
  'Identity & Direction':
    'Searching for love and direction outside yourself',
  'Survival Instinct':
    'Holding onto things which no longer serve you',
  'Conceptualization':
    'Getting distracted and losing focus',
  'Inspiration':
    'Trying to answer other people\'s questions',
  'Drive & Stamina':
    'Rushing to get things done to relieve stress',
  'Energy Resource':
    'Not knowing when enough is enough',
  'Communication & Action':
    'Trying to be seen and heard',
};

/**
 * Detailed shadow writeups - longer explanations of the shadow pattern.
 * Ported from fractalhumandesign WelcomeCampaignText.tsx (limited set available).
 */
export const shadowWriteups: Record<string, string> = {
  'Drive & Stamina': `You may find that you feel pressured to get things done, which would cause you
    to rush to complete them. Unfortunately once one thing gets done, there's always
    something else to rush to complete. Being a hamster on a hamster wheel can be an
    accurate metaphor. This can get especially bad when certain other people come into
    your space, and even if they don't verbally pressure you to do something, you can
    still feel pressured.`,
  'Energy Resource': `We live in a Generator world: around 70% of the world have this consistent
    source of energy. You without this source of energy can feel like something is
    lacking, working harder and harder in order to keep up. And because you may not know
    when it's time to stop, you might have a tendency to work to exhaustion. Make sure
    to get plenty of rest: you need more than most people!`,
};

/**
 * Gate traits mapping for bridge descriptions.
 * Each gate maps to:
 * - trait: The quality the bridging gate represents
 * - harmonicGate: The gate(s) that complete the channel (number or array)
 * - harmonicTrait: The complementary trait(s) needed
 * - strength: The full strength achieved when combined
 *
 * Gates 10, 20, 34, 57 have multiple possible harmonics (arrays).
 */
export const gateTraits: Record<number, {
  trait: string;
  harmonicGate: number | number[];
  harmonicTrait: string | string[];
  strength: string | string[];
}> = {
  1: { trait: "Creative Self-Expression", harmonicGate: 8, harmonicTrait: "Contribution", strength: "Inspiration" },
  2: { trait: "The Driver", harmonicGate: 14, harmonicTrait: "Power Skills", strength: "Direction" },
  3: { trait: "Ordering", harmonicGate: 60, harmonicTrait: "Acceptance", strength: "Innovation" },
  4: { trait: "Formulization", harmonicGate: 63, harmonicTrait: "Doubt", strength: "Logic Process" },
  5: { trait: "Fixed Patterns", harmonicGate: 15, harmonicTrait: "Diversity", strength: "Patterns & Rhythms" },
  6: { trait: "Friction", harmonicGate: 59, harmonicTrait: "Achieving Union", strength: "Interaction" },
  7: { trait: "The Leader", harmonicGate: 31, harmonicTrait: "Influence", strength: "Leadership" },
  8: { trait: "Contribution", harmonicGate: 1, harmonicTrait: "Creative Self-Expression", strength: "Inspiration" },
  9: { trait: "Focus", harmonicGate: 52, harmonicTrait: "Stillness", strength: "Concentration" },
  10: { trait: "Behavior of Self", harmonicGate: [20, 34, 57], harmonicTrait: ["Contemplation", "Personal Power", "Intuitive Insight"], strength: ["Higher Principles", "Conviction", "Perfected Form"] },
  11: { trait: "Ideas", harmonicGate: 56, harmonicTrait: "Stimulation", strength: "Curiosity" },
  12: { trait: "Caution", harmonicGate: 22, harmonicTrait: "Openness", strength: "Socialness" },
  13: { trait: "The Listener", harmonicGate: 33, harmonicTrait: "Retreat", strength: "Witnessing" },
  14: { trait: "Power Skills", harmonicGate: 2, harmonicTrait: "The Driver", strength: "Direction" },
  15: { trait: "Diversity", harmonicGate: 5, harmonicTrait: "Fixed Patterns", strength: "Patterns & Rhythms" },
  16: { trait: "Skills", harmonicGate: 48, harmonicTrait: "Depth", strength: "Talent" },
  17: { trait: "Opinion", harmonicGate: 62, harmonicTrait: "Details", strength: "Organization" },
  18: { trait: "Correction", harmonicGate: 58, harmonicTrait: "Vitality", strength: "Judgment" },
  19: { trait: "Social Needs", harmonicGate: 49, harmonicTrait: "Principles", strength: "Resources" },
  20: { trait: "Contemplation", harmonicGate: [10, 34, 57], harmonicTrait: ["Behavior of Self", "Personal Power", "Intuitive Insight"], strength: ["Higher Principles", "Charisma", "Spontaneity"] },
  21: { trait: "Control", harmonicGate: 45, harmonicTrait: "Gathering Together", strength: "Management" },
  22: { trait: "Openness", harmonicGate: 12, harmonicTrait: "Caution", strength: "Socialness" },
  23: { trait: "Assimilation", harmonicGate: 43, harmonicTrait: "Breakthrough", strength: "Efficiency" },
  24: { trait: "Rationalization", harmonicGate: 61, harmonicTrait: "Inner Truth", strength: "Creative Process" },
  25: { trait: "Innocence", harmonicGate: 51, harmonicTrait: "Initiative", strength: "Competitiveness" },
  26: { trait: "Sales/Marketing", harmonicGate: 44, harmonicTrait: "Alertness", strength: "Transmitter" },
  27: { trait: "Nourishment", harmonicGate: 50, harmonicTrait: "Values", strength: "Custodianship" },
  28: { trait: "Game Player", harmonicGate: 38, harmonicTrait: "Fighter", strength: "Tenaciousness" },
  29: { trait: "Perseverance", harmonicGate: 46, harmonicTrait: "Determination", strength: "Discovery" },
  30: { trait: "Fate", harmonicGate: 41, harmonicTrait: "The Dreamer", strength: "Imagination" },
  31: { trait: "Influence", harmonicGate: 7, harmonicTrait: "The Leader", strength: "Leadership" },
  32: { trait: "Continuity", harmonicGate: 54, harmonicTrait: "Drive", strength: "Ambition" },
  33: { trait: "Retreat", harmonicGate: 13, harmonicTrait: "The Listener", strength: "Witnessing" },
  34: { trait: "Personal Power", harmonicGate: [10, 57, 20], harmonicTrait: ["Behavior of Self", "Intuitive Insight", "Contemplation"], strength: ["Conviction", "Power", "Charisma"] },
  35: { trait: "Progress", harmonicGate: 36, harmonicTrait: "Crisis", strength: "The Experiencer" },
  36: { trait: "Crisis", harmonicGate: 35, harmonicTrait: "Progress", strength: "The Experiencer" },
  37: { trait: "Friendship/Family", harmonicGate: 40, harmonicTrait: "Deliverance", strength: "Community" },
  38: { trait: "Fighter", harmonicGate: 28, harmonicTrait: "Game Player", strength: "Tenaciousness" },
  39: { trait: "Obstruction", harmonicGate: 55, harmonicTrait: "Spirit", strength: "Provoking" },
  40: { trait: "Deliverance", harmonicGate: 37, harmonicTrait: "Friendship/Family", strength: "Community" },
  41: { trait: "The Dreamer", harmonicGate: 30, harmonicTrait: "Fate", strength: "Imagination" },
  42: { trait: "Growth", harmonicGate: 53, harmonicTrait: "Beginnings", strength: "Cycles" },
  43: { trait: "Breakthrough", harmonicGate: 23, harmonicTrait: "Assimilation", strength: "Efficiency" },
  44: { trait: "Alertness", harmonicGate: 26, harmonicTrait: "Sales/Marketing", strength: "Transmitter" },
  45: { trait: "Gathering Together", harmonicGate: 21, harmonicTrait: "Control", strength: "Management" },
  46: { trait: "Determination", harmonicGate: 29, harmonicTrait: "Perseverance", strength: "Discovery" },
  47: { trait: "Realization", harmonicGate: 64, harmonicTrait: "Abstraction", strength: "Experiential Process" },
  48: { trait: "Depth", harmonicGate: 16, harmonicTrait: "Skills", strength: "Talent" },
  49: { trait: "Principles", harmonicGate: 19, harmonicTrait: "Social Needs", strength: "Resources" },
  50: { trait: "Values", harmonicGate: 27, harmonicTrait: "Nourishment", strength: "Custodianship" },
  51: { trait: "Initiative", harmonicGate: 25, harmonicTrait: "Innocence", strength: "Competitiveness" },
  52: { trait: "Stillness", harmonicGate: 9, harmonicTrait: "Focus", strength: "Concentration" },
  53: { trait: "Beginnings", harmonicGate: 42, harmonicTrait: "Growth", strength: "Cycles" },
  54: { trait: "Drive", harmonicGate: 32, harmonicTrait: "Continuity", strength: "Ambition" },
  55: { trait: "Spirit", harmonicGate: 39, harmonicTrait: "Obstruction", strength: "Provoking" },
  56: { trait: "Stimulation", harmonicGate: 11, harmonicTrait: "Ideas", strength: "Curiosity" },
  57: { trait: "Intuitive Insight", harmonicGate: [34, 10, 20], harmonicTrait: ["Personal Power", "Behavior of Self", "Contemplation"], strength: ["Power", "Perfected Form", "Spontaneity"] },
  58: { trait: "Vitality", harmonicGate: 18, harmonicTrait: "Correction", strength: "Judgment" },
  59: { trait: "Achieving Union", harmonicGate: 6, harmonicTrait: "Friction", strength: "Interaction" },
  60: { trait: "Acceptance", harmonicGate: 3, harmonicTrait: "Ordering", strength: "Innovation" },
  61: { trait: "Inner Truth", harmonicGate: 24, harmonicTrait: "Rationalization", strength: "Creative Process" },
  62: { trait: "Details", harmonicGate: 17, harmonicTrait: "Opinion", strength: "Organization" },
  63: { trait: "Doubt", harmonicGate: 4, harmonicTrait: "Formulization", strength: "Logic Process" },
  64: { trait: "Abstraction", harmonicGate: 47, harmonicTrait: "Realization", strength: "Experiential Process" }
};

/**
 * Channel strengths — indexed by the 0-based channel number from the Maia API.
 * Each entry maps a channel index to its strength name, gate pair, and thematic group.
 */
export const channelStrengths = [
  { name: 'Higher Principles', gates: [10, 20], thematic: 'Empowerment' },
  { name: 'Charisma', gates: [20, 34], thematic: 'Empowerment' },
  { name: 'Power', gates: [34, 57], thematic: 'Empowerment' },
  { name: 'Perfected Form', gates: [10, 57], thematic: 'Empowerment' },
  { name: 'Creative Process', gates: [24, 61], thematic: 'Empowerment' },
  { name: 'Efficiency', gates: [23, 43], thematic: 'Empowerment' },
  { name: 'Tenaciousness', gates: [28, 38], thematic: 'Empowerment' },
  { name: 'Spontaneity', gates: [20, 57], thematic: 'Empowerment' },
  { name: 'Provoking', gates: [39, 55], thematic: 'Empowerment' },
  { name: 'Socialness', gates: [12, 22], thematic: 'Empowerment' },
  { name: 'Innovation', gates: [3, 60], thematic: 'Empowerment' },
  { name: 'Direction', gates: [2, 14], thematic: 'Empowerment' },
  { name: 'Inspiration', gates: [1, 8], thematic: 'Empowerment' },
  { name: 'Conviction', gates: [10, 34], thematic: 'Empowerment' },
  { name: 'Competitiveness', gates: [25, 51], thematic: 'Empowerment' },
  { name: 'Logic Process', gates: [4, 63], thematic: 'Sharing' },
  { name: 'Organization', gates: [17, 62], thematic: 'Sharing' },
  { name: 'Judgment', gates: [18, 58], thematic: 'Sharing' },
  { name: 'Talent', gates: [16, 48], thematic: 'Sharing' },
  { name: 'Concentration', gates: [9, 52], thematic: 'Sharing' },
  { name: 'Patterns & Rhythms', gates: [5, 15], thematic: 'Sharing' },
  { name: 'Leadership', gates: [7, 31], thematic: 'Sharing' },
  { name: 'Imagination', gates: [30, 41], thematic: 'Sharing' },
  { name: 'The Experiencer', gates: [35, 36], thematic: 'Sharing' },
  { name: 'Experiential Process', gates: [47, 64], thematic: 'Sharing' },
  { name: 'Curiosity', gates: [11, 56], thematic: 'Sharing' },
  { name: 'Cycles', gates: [42, 53], thematic: 'Sharing' },
  { name: 'Discovery', gates: [29, 46], thematic: 'Sharing' },
  { name: 'Witnessing', gates: [13, 33], thematic: 'Sharing' },
  { name: 'Ambition', gates: [32, 54], thematic: 'Support' },
  { name: 'Transmitter', gates: [26, 44], thematic: 'Support' },
  { name: 'Resources', gates: [19, 49], thematic: 'Support' },
  { name: 'Community', gates: [37, 40], thematic: 'Support' },
  { name: 'Management', gates: [21, 45], thematic: 'Support' },
  { name: 'Interaction', gates: [6, 59], thematic: 'Support' },
  { name: 'Custodianship', gates: [27, 50], thematic: 'Support' },
] as const;
