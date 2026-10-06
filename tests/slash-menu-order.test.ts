import { describe, it, expect } from 'vitest';
import { orderForSlashMenu } from '@/app/admin/newsletters/[id]/[number]/slash-menu-order';

const item = (title: string, category: string) => ({ title, category });

describe('orderForSlashMenu', () => {
  it('puts the library categories first, in the library order', () => {
    const out = orderForSlashMenu([
      item('Divider', 'Utility'),
      item('Columns', 'Layout'),
      item('Image', 'Media'),
      item('Heading', 'Text'),
    ]);
    expect(out.map(i => i.category)).toEqual(['Text', 'Media', 'Layout', 'Utility']);
  });

  // Regression: custom categories were sorted before Utility, but the menu shows
  // them after it, so selecting an item ran the one at that index instead.
  it('puts custom categories after Utility, in first-appearance order', () => {
    const out = orderForSlashMenu([
      item('If/then', 'Conditionals'),
      item('Library', 'Content blocks'),
      item('Divider', 'Utility'),
      item('Text', 'Text'),
    ]);
    expect(out.map(i => i.title)).toEqual(['Text', 'Divider', 'If/then', 'Library']);
  });

  it('keeps the original order within a category', () => {
    const out = orderForSlashMenu([item('B', 'Text'), item('X', 'Layout'), item('A', 'Text')]);
    expect(out.map(i => i.title)).toEqual(['B', 'A', 'X']);
  });
});
