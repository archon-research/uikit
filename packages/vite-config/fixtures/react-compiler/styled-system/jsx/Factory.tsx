// Panda generates this subtree only under `jsxFramework: 'react'`, and what it
// generates there are real components. It is carved back OUT of the default
// `styled-system` exclusion for that reason, so this one must come out of the
// build compiled — the same shape as `Component.tsx`, one directory deeper.
export function Factory({ items }: { items: string[] }) {
  const upper = items.map((item) => item.toUpperCase());
  return (
    <ul>
      {upper.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
