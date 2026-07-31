// Human Design lookup tables and constants
// Adapted from fractalhumandesign

export const types = [
  'Generator',
  'Manifesting Generator',
  'Manifestor',
  'Projector',
  'Reflector'
];

export const careerDesigns = [
  '🔥 Classic Builder',
  '🔥 Express Builder',
  '💡 Initiator',
  '🔑 Advisor',
  '🔍 Evaluator'
];

export const innerAuthorityTypes = [
  'Emotional',
  'Sacral',
  'Splenic',
  'Ego',
  'Self-Projected',
  'Ego-Projected',
  'None'
];

export const innerAuthorityDescriptions = [
  'wait for emotional clarity',
  'follow your gut',
  'follow your instincts',
  'follow your willful determination',
  'listen to what you say',
  'follow your willful determination',
  'listen to what you say'
];

export const signatureThemes = [
  'satisfaction',
  'satisfaction',
  'peace',
  'success',
  'surprise'
];

export const notSelfThemes = [
  'frustration',
  'frustration',
  'anger',
  'bitterness',
  'disappointment'
];

export const strategies = [
  'wait to respond before engaging',
  'wait to respond before engaging',
  'inform before taking action',
  'wait for recognition and invitation',
  'wait a 28 day cycle to reflect and assess'
];

export const definitions = [
  'none',
  'single',
  'split',
  'triple split',
  'quadruple split'
];

export const assimilationStyles = [
  'objective',
  'independent',
  'collaborative',
  'synthesizing',
  'subjective'
];

// --- Email-specific constants (ported from fractalhumandesign/utils/parse-chart.ts) ---

// GIF button images per type — used in email video links
export const typeButtonGifs = [
  'https://fractalhumandesign.s3.us-east-1.amazonaws.com/site/images/generator-button.gif',
  'https://fractalhumandesign.s3.us-east-1.amazonaws.com/site/images/generator-button.gif',
  'https://fractalhumandesign.s3.us-east-1.amazonaws.com/site/images/manifestor-button.gif',
  'https://fractalhumandesign.s3.us-east-1.amazonaws.com/site/images/projector-button.gif',
  'https://fractalhumandesign.s3.us-east-1.amazonaws.com/site/images/reflector-button.gif'
];

// YouTube video links per type
export const typeVideos = [
  'https://youtu.be/9PVgkBzpPqs',
  'https://youtu.be/9PVgkBzpPqs',
  'https://youtu.be/qvnRU2tdNXM',
  'https://youtu.be/Od8wVEL5b5w',
  'https://youtu.be/bgdaZBB2wCo'
];

export const strategyVideos = [
  'https://youtu.be/_g3cx77EeLs',
  'https://youtu.be/_g3cx77EeLs',
  'https://youtu.be/YTTm9Ziyi-8',
  'https://youtu.be/vypbRJShWyM',
  'https://youtu.be/924KXvH3mv4'
];

// Per-authority video links
export const innerAuthorityVideos = [
  'https://youtu.be/e9g6q1pKJeo',
  'https://youtu.be/0sUPwjp025M',
  'https://youtu.be/7S552VXC1tk',
  'https://youtu.be/8Nu3WvcQ0jA',
  'https://youtu.be/cF6CxUTGmfU',
  'https://youtu.be/8Nu3WvcQ0jA',
  'https://youtu.be/OvSo9Aa2XCc'
];

// Per-type signature/not-self videos
export const signatureVideos = [
  'https://youtu.be/fHGRdJSyE34',
  'https://youtu.be/fHGRdJSyE34',
  'https://youtu.be/UfkIprGbdHw',
  'https://youtu.be/eHWeVZIMrTw',
  'https://youtu.be/ltxpSWRx5t4'
];

// Adjective forms of themes (used in welcome4)
export const signatureThemeAdjectives = [
  'satisfied',
  'satisfied',
  'peaceful',
  'successful',
  'surprised'
];

export const notSelfThemeAdjectives = [
  'frustrated',
  'frustrated',
  'angry',
  'bitter',
  'disappointed'
];

// Standalone video URLs used in specific emails
export const strategyVideoMG = 'https://youtu.be/OkRewoajREQ';
export const sleepAloneProjectors = 'https://youtu.be/A1PBKKAJslo';
