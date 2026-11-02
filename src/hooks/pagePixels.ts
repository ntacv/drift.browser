export function viewportPoint(x: number, y: number, width: number, height: number) {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return { x: Math.min(1, Math.max(0, x / width)), y: Math.min(1, Math.max(0, y / height)) };
}
