// Stands in for a consumer's own generated tree. Nothing excludes it by
// default, so it is compiled unless `options.exclude` names it — which is what
// makes it a live test of that option rather than a vacuous one.
export function Generated({ items }: { items: string[] }) {
  const upper = items.map((item) => item.toUpperCase());
  return (
    <ul>
      {upper.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
