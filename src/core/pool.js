// Fixed-capacity object pool. No allocation after construction (rubric S8).
// Live objects are packed in [0, count); kill() swaps with the last live slot.
export function makePool(capacity, factory) {
  const items = new Array(capacity);
  for (let i = 0; i < capacity; i++) items[i] = factory();
  let count = 0;
  return {
    items,
    get count() { return count; },
    spawn() {
      if (count >= capacity) return null; // hard cap, never grow
      return items[count++];
    },
    // Kill by index (valid during reverse iteration).
    killAt(i) {
      count--;
      const tmp = items[i]; items[i] = items[count]; items[count] = tmp;
    },
    clear() { count = 0; },
  };
}
