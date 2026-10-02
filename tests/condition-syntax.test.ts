import { describe, it, expect } from 'vitest';
import {
  parseCondition,
  composeCondition,
  composeNewsletterCondition,
  composeModeCondition,
} from '@/app/admin/newsletters/[id]/[number]/condition-syntax';
import { EMAIL_FIELDS } from '@/app/admin/newsletters/[id]/[number]/email-fields';

describe('shadows chart field', () => {
  it('composes contains / not contains', () => {
    expect(composeCondition('shadows', 'contains', 'Overcompensating')).toBe('shadows contains "Overcompensating"');
    expect(composeCondition('shadows', 'not contains', 'Overcompensating')).toBe('not shadows contains "Overcompensating"');
  });

  it('round-trips through parseCondition as a chart condition', () => {
    for (const op of ['contains', 'not contains']) {
      expect(parseCondition(composeCondition('shadows', op, 'Touchy & nervous'))).toEqual({
        type: 'chart', field: 'shadows', op, value: 'Touchy & nervous',
      });
    }
  });
});

describe('mode condition', () => {
  it('composes mode == / !=', () => {
    expect(composeModeCondition('==', 'web')).toBe('mode == "web"');
    expect(composeModeCondition('!=', 'email')).toBe('mode != "email"');
  });

  it('parses as a mode condition, not a chart field', () => {
    expect(parseCondition('mode == "web"')).toEqual({ type: 'mode', op: '==', value: 'web' });
    expect(parseCondition('mode != "email"')).toEqual({ type: 'mode', op: '!=', value: 'email' });
  });
});

describe('existing conditions', () => {
  it('parses chart field conditions', () => {
    expect(parseCondition(composeCondition('type', '!=', 'Projector'))).toEqual({
      type: 'chart', field: 'type', op: '!=', value: 'Projector',
    });
  });

  it('parses compound "any" values', () => {
    expect(composeCondition('career_type', '==', 'Builder (any)'))
      .toBe('career_type == "Classic Builder" or career_type == "Express Builder"');
    expect(parseCondition(composeCondition('career_type', '!=', 'Builder (any)'))).toEqual({
      type: 'chart', field: 'career_type', op: '!=', value: 'Builder (any)',
    });
  });

  it('parses newsletter engagement conditions', () => {
    expect(parseCondition(composeNewsletterCondition(7, 'opened', true))).toEqual({
      type: 'newsletter', number: 7, property: 'opened', negated: true,
    });
  });

  it('returns null for unrecognized conditions', () => {
    expect(parseCondition('foo > 3')).toBeNull();
  });
});

describe('top_shadow "Something missing"', () => {
  const variants = [
    'Blaming yourself for something missing',
    'Blaming others for something missing',
    'Blaming the world for something missing',
  ];

  it('expands to every bridge-shadow variant', () => {
    expect(composeCondition('top_shadow', '==', 'Something missing'))
      .toBe(variants.map(v => `top_shadow == "${v}"`).join(' or '));
    expect(composeCondition('top_shadow', '!=', 'Something missing'))
      .toBe(variants.map(v => `top_shadow != "${v}"`).join(' and '));
  });

  it('round-trips through parseCondition', () => {
    for (const op of ['==', '!=']) {
      expect(parseCondition(composeCondition('top_shadow', op, 'Something missing'))).toEqual({
        type: 'chart', field: 'top_shadow', op, value: 'Something missing',
      });
    }
  });

  it('is the only bridge option in the Top Shadow dropdown', () => {
    const topShadow = EMAIL_FIELDS.find(f => f.key === 'top_shadow')!;
    expect(topShadow.values).toContain('Something missing');
    for (const v of variants) expect(topShadow.values).not.toContain(v);
    expect(topShadow.values).toContain('Overcompensating');
  });
});
