export function hasPermission(granted: readonly string[], required?: string) {
  return required === undefined || granted.includes(required);
}
