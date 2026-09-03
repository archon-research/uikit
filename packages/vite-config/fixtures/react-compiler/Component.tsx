// A component the compiler has something to do to: `upper` is derived from a
// prop on every render, so an optimized build caches it behind a memo slot.
export function Component({ items }: { items: string[] }) {
  const upper = items.map((item) => item.toUpperCase());
  return (
    <ul>
      {upper.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
