/**
 * Category order the @react-email/editor slash menu displays first
 * (CATEGORY_ORDER in its command-list, which isn't exported). Any other
 * category is shown after these, in first-appearance order.
 */
const LIBRARY_CATEGORY_ORDER = ['Text', 'Media', 'Layout', 'Utility'];

/**
 * Order slash command items exactly as the menu will display them.
 *
 * The menu groups items by category for display but selects by array index,
 * so the array order must match the grouped order — otherwise choosing one
 * item runs another. Mirrors the library's groupByCategory().
 */
export function orderForSlashMenu<T extends { category: string }>(items: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(item.category);
    if (group) group.push(item);
    else groups.set(item.category, [item]);
  }
  const ordered: T[] = [];
  for (const category of LIBRARY_CATEGORY_ORDER) {
    ordered.push(...(groups.get(category) ?? []));
    groups.delete(category);
  }
  for (const group of groups.values()) ordered.push(...group);
  return ordered;
}
