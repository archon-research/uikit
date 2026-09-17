export function useState(initial) {
  return [initial, () => {}];
}
export function createElement(type, props) {
  return { type, props };
}
