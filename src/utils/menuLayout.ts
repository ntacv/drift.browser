export const MENU_TILE_IDS = [
  'back', 'forward', 'refresh', 'fullscreen', 'share', 'settings', 'history', 'workspace',
] as const;

export type MenuTileId = typeof MENU_TILE_IDS[number];
export type TileSize = 's' | 'm' | 'l';

export const MENU_TILE_SIZE: Record<MenuTileId, TileSize> = {
  back: 's', forward: 's', refresh: 's', fullscreen: 's',
  share: 'm', settings: 'm', history: 'm', workspace: 'm',
};

const LEGACY_MENU_IDS: MenuTileId[] = ['share', 'settings', 'history', 'workspace'];

export function normalizeMenuTileOrder(order: unknown): MenuTileId[] {
  if (!Array.isArray(order)) return [...MENU_TILE_IDS];
  const result = [...new Set(order.filter((id): id is MenuTileId => MENU_TILE_IDS.includes(id)))];
  if (!result.includes('settings')) result.push('settings');
  return result;
}

export function migrateMenuTileOrder(order: unknown): MenuTileId[] {
  const legacy = Array.isArray(order)
    ? [...new Set(order.filter((id): id is MenuTileId => LEGACY_MENU_IDS.includes(id)))]
    : [];
  return ['back', 'forward', 'refresh', 'fullscreen', ...legacy, ...LEGACY_MENU_IDS.filter((id) => !legacy.includes(id))];
}

export function insertMenuTile(order: MenuTileId[], id: MenuTileId, beforeId: MenuTileId | null): MenuTileId[] {
  if (id === beforeId) return order;
  const next = order.filter((item) => item !== id);
  const index = beforeId === null ? -1 : next.indexOf(beforeId);
  next.splice(index < 0 ? next.length : index, 0, id);
  return normalizeMenuTileOrder(next);
}

export function removeMenuTile(order: MenuTileId[], id: MenuTileId): MenuTileId[] {
  return id === 'settings' ? order : normalizeMenuTileOrder(order.filter((item) => item !== id));
}

export interface TileFrame {
  id: MenuTileId;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function menuDropTarget(frames: TileFrame[], x: number, y: number): MenuTileId | null {
  for (const frame of frames) {
    if (y < frame.y || (y <= frame.y + frame.height && x < frame.x + frame.width / 2)) {
      return frame.id;
    }
  }
  return null;
}

export function actionMenuHeight(contentHeight: number, screenHeight: number, availableHeight: number): number {
  return Math.max(0, Math.min(contentHeight, screenHeight / 2, availableHeight));
}
