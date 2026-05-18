/**
 * Shell argument escaping utility
 */
export function shellEscape(arg: string): string {
  if (/^[a-zA-Z0-9_\-./:=]+$/.test(arg)) {
    return arg;
  }
  return `'${arg.replace(/'/g, "'\\''")}'`;
}
