// Byte-for-byte the same shape as `Component.tsx`, but under `styled-system/`.
// If the id filter is wired up, this one comes out of the build uncompiled —
// unlike its sibling under `styled-system/jsx/`, which the default exclusion
// deliberately carves back out.
export function Excluded({ items }: { items: string[] }) {
  const upper = items.map((item) => item.toUpperCase());
  return (
    <ul>
      {upper.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
