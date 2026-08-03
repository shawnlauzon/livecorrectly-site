import { describe, it, expect } from 'vitest';
import hdChart from '../lib/hd-chart/index';
import type { Chart, ChartRecord } from '../lib/types/chart';
import shawnsChartData from './fixtures/shawns-chart.json';

describe('Shadow Functionality', () => {
  describe("Shawn's Chart", () => {
    // Extract the actual chart data from the fixture
    const chartRecord = shawnsChartData[0] as unknown as { chart: ChartRecord };
    const shawnChart = chartRecord.chart.chart;

    const hd = hdChart(shawnChart);

    it('should have the expected chart properties', () => {
      expect(shawnChart.type).toBe(0); // Generator
      expect(shawnChart.definition).toBe(1); // Split
      expect(shawnChart.bridges).toBe(null);
      expect(shawnChart.centers).toEqual([2, 2, 2, 1, 1, 2, 1, 0, 0]);
    });

    it('should not have Bringing Traits/Strengths shadow (definition is Split, not Collaborative/Subjective)', () => {
      expect(hd.hasBringingTraitsShadow()).toBe(false);
    });

    it('should return exactly 5 shadows', () => {
      const shadows = hd.getShadows();
      expect(shadows).toHaveLength(5);
    });

    it('should return shadows in correct priority order', () => {
      const shadows = hd.getShadows();
      expect(shadows).toEqual([
        'Willpower', // Priority 2 - Ego undefined (index 4, status 1)
        'Emotional Intelligence', // Priority 3 - Solar Plexus undefined (index 3, status 1)
        'Conceptualization', // Priority 6 - Ajna open (index 7, status 0)
        'Inspiration', // Priority 7 - Head open (index 8, status 0)
        'Communication & Action', // Priority 10 - Throat undefined (index 6, status 1)
      ]);
    });

    it('should include Willpower shadow (Ego undefined)', () => {
      const shadows = hd.getShadows();
      expect(shadows).toContain('Willpower');
    });

    it('should include Emotional Intelligence shadow (Solar Plexus undefined)', () => {
      const shadows = hd.getShadows();
      expect(shadows).toContain('Emotional Intelligence');
    });

    it('should include Conceptualization shadow (Ajna open)', () => {
      const shadows = hd.getShadows();
      expect(shadows).toContain('Conceptualization');
    });

    it('should include Inspiration shadow (Head open)', () => {
      const shadows = hd.getShadows();
      expect(shadows).toContain('Inspiration');
    });

    it('should include Communication & Action shadow (Throat undefined)', () => {
      const shadows = hd.getShadows();
      expect(shadows).toContain('Communication & Action');
    });

    it('should NOT include shadows for defined centers', () => {
      const shadows = hd.getShadows();
      expect(shadows).not.toContain('Drive & Stamina'); // Root is defined
      expect(shadows).not.toContain('Energy Resource'); // Sacral is defined
      expect(shadows).not.toContain('Survival Instinct'); // Spleen is defined
      expect(shadows).not.toContain('Identity & Direction'); // G Center is defined
    });
  });

  describe('Bringing Traits/Strengths Shadow', () => {
    it('should return true when bridges exist and definition is Collaborative (2)', () => {
      const chart: Chart = {
        type: 0,
        view: 0,
        cross: 0,
        gates: [],
        group: { lb: false, theme: [], env: [] },
        sense: 0,
        cycles: { chiron: '', saturn: '', uranus: '', secondSaturn: '' },
        centers: [0, 0, 0, 0, 0, 0, 0, 0, 0], // All open
        planets: [],
        profile: 0,
        channels: [],
        variable: 0,
        authority: 0,
        cognition: 0,
        definition: 2, // Collaborative/Split
        motivation: 0,
        environment: 0,
        transference: 0,
        determination: 0,
        designBaseOrientation: 0,
        personalityBaseOrientation: 0,
        bridges: {
          bridgingGates: [1, 2],
          bridgingChannels: ['1-8'],
          bridgingFarGates: [],
        },
      };

      const hd = hdChart(chart);
      expect(hd.hasBringingTraitsShadow()).toBe(true);
    });

    it('should return true when bridges exist and definition is Subjective (4)', () => {
      const chart: Chart = {
        type: 0,
        view: 0,
        cross: 0,
        gates: [],
        group: { lb: false, theme: [], env: [] },
        sense: 0,
        cycles: { chiron: '', saturn: '', uranus: '', secondSaturn: '' },
        centers: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        planets: [],
        profile: 0,
        channels: [],
        variable: 0,
        authority: 0,
        cognition: 0,
        definition: 4, // Subjective/Quadruple
        motivation: 0,
        environment: 0,
        transference: 0,
        determination: 0,
        designBaseOrientation: 0,
        personalityBaseOrientation: 0,
        bridges: {
          bridgingGates: [1],
        },
      };

      const hd = hdChart(chart);
      expect(hd.hasBringingTraitsShadow()).toBe(true);
    });

    it('should return true when bridges is null but definition is Collaborative (2)', () => {
      // The shadow applies based on definition type alone — bridge data
      // is only needed for per-gate details, not for shadow presence.
      const chart: Chart = {
        type: 0,
        view: 0,
        cross: 0,
        gates: [],
        group: { lb: false, theme: [], env: [] },
        sense: 0,
        cycles: { chiron: '', saturn: '', uranus: '', secondSaturn: '' },
        centers: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        planets: [],
        profile: 0,
        channels: [],
        variable: 0,
        authority: 0,
        cognition: 0,
        definition: 2, // Collaborative — shadow applies even without bridge data
        motivation: 0,
        environment: 0,
        transference: 0,
        determination: 0,
        designBaseOrientation: 0,
        personalityBaseOrientation: 0,
        bridges: null,
      };

      const hd = hdChart(chart);
      expect(hd.hasBringingTraitsShadow()).toBe(true);
    });

    it('should return false when definition is not Collaborative or Subjective', () => {
      const chart: Chart = {
        type: 0,
        view: 0,
        cross: 0,
        gates: [],
        group: { lb: false, theme: [], env: [] },
        sense: 0,
        cycles: { chiron: '', saturn: '', uranus: '', secondSaturn: '' },
        centers: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        planets: [],
        profile: 0,
        channels: [],
        variable: 0,
        authority: 0,
        cognition: 0,
        definition: 1, // Split (not Collaborative/Subjective)
        motivation: 0,
        environment: 0,
        transference: 0,
        determination: 0,
        designBaseOrientation: 0,
        personalityBaseOrientation: 0,
        bridges: {
          bridgingGates: [1],
        },
      };

      const hd = hdChart(chart);
      expect(hd.hasBringingTraitsShadow()).toBe(false);
    });

    it('should include Bringing Traits/Strengths as first shadow when applicable', () => {
      const chart: Chart = {
        type: 0,
        view: 0,
        cross: 0,
        gates: [],
        group: { lb: false, theme: [], env: [] },
        sense: 0,
        cycles: { chiron: '', saturn: '', uranus: '', secondSaturn: '' },
        centers: [0, 0, 0, 1, 0, 0, 0, 0, 0], // Ego undefined
        planets: [],
        profile: 0,
        channels: [],
        variable: 0,
        authority: 0,
        cognition: 0,
        definition: 2, // Collaborative
        motivation: 0,
        environment: 0,
        transference: 0,
        determination: 0,
        designBaseOrientation: 0,
        personalityBaseOrientation: 0,
        bridges: {
          bridgingGates: [1],
        },
      };

      const hd = hdChart(chart);
      const shadows = hd.getShadows();
      expect(shadows[0]).toBe('Bringing Traits/Strengths');
      expect(shadows).toContain('Willpower'); // Ego is undefined
    });
  });

  describe('Shadow Priority Order', () => {
    it('should return shadows in correct priority regardless of center status order', () => {
      // All centers undefined except Root
      const chart: Chart = {
        type: 0,
        view: 0,
        cross: 0,
        gates: [],
        group: { lb: false, theme: [], env: [] },
        sense: 0,
        cycles: { chiron: '', saturn: '', uranus: '', secondSaturn: '' },
        centers: [2, 1, 1, 1, 1, 1, 1, 1, 1], // Root defined, all others undefined
        planets: [],
        profile: 0,
        channels: [],
        variable: 0,
        authority: 0,
        cognition: 0,
        definition: 1,
        motivation: 0,
        environment: 0,
        transference: 0,
        determination: 0,
        designBaseOrientation: 0,
        personalityBaseOrientation: 0,
        bridges: null,
      };

      const hd = hdChart(chart);
      const shadows = hd.getShadows();

      // Should follow priority order, not center index order
      expect(shadows).toEqual([
        'Willpower', // Priority 2 - Ego (index 4)
        'Emotional Intelligence', // Priority 3 - Solar Plexus (index 3)
        'Identity & Direction', // Priority 4 - G Center (index 5)
        'Survival Instinct', // Priority 5 - Spleen (index 2)
        'Conceptualization', // Priority 6 - Ajna (index 7)
        'Inspiration', // Priority 7 - Head (index 8)
        // No Drive & Stamina - Root is defined (index 0)
        'Energy Resource', // Priority 9 - Sacral (index 1)
        'Communication & Action', // Priority 10 - Throat (index 6)
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array when all centers are defined', () => {
      const chart: Chart = {
        type: 0,
        view: 0,
        cross: 0,
        gates: [],
        group: { lb: false, theme: [], env: [] },
        sense: 0,
        cycles: { chiron: '', saturn: '', uranus: '', secondSaturn: '' },
        centers: [2, 2, 2, 2, 2, 2, 2, 2, 2], // All defined
        planets: [],
        profile: 0,
        channels: [],
        variable: 0,
        authority: 0,
        cognition: 0,
        definition: 0,
        motivation: 0,
        environment: 0,
        transference: 0,
        determination: 0,
        designBaseOrientation: 0,
        personalityBaseOrientation: 0,
        bridges: null,
      };

      const hd = hdChart(chart);
      const shadows = hd.getShadows();
      expect(shadows).toEqual([]);
    });

    it('should handle mix of open (0) and undefined (1) centers', () => {
      const chart: Chart = {
        type: 0,
        view: 0,
        cross: 0,
        gates: [],
        group: { lb: false, theme: [], env: [] },
        sense: 0,
        cycles: { chiron: '', saturn: '', uranus: '', secondSaturn: '' },
        centers: [0, 1, 2, 2, 2, 2, 2, 2, 2], // Root open, Sacral undefined, rest defined
        planets: [],
        profile: 0,
        channels: [],
        variable: 0,
        authority: 0,
        cognition: 0,
        definition: 0,
        motivation: 0,
        environment: 0,
        transference: 0,
        determination: 0,
        designBaseOrientation: 0,
        personalityBaseOrientation: 0,
        bridges: null,
      };

      const hd = hdChart(chart);
      const shadows = hd.getShadows();
      expect(shadows).toContain('Drive & Stamina'); // Root open (0)
      expect(shadows).toContain('Energy Resource'); // Sacral undefined (1)
      expect(shadows).toHaveLength(2);
    });
  });
});
